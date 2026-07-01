import { randomUUID } from 'node:crypto';
import { Session } from './core/session';
import { Runner } from './loop/runner';
import { Config } from './core/config';
import { agentLocation } from './shared/location';
import { SettingsStore, type SettingsSchema } from './core/store.settings';
import { Cron } from './cron/cron';
import { CronStore } from './cron/store';
import { Skills } from './skills/skills';
import { SkillsStore, type SkillsSchema } from './skills/store';
import { HealthStore } from './health/store';
import { McpStore, type ConnectorStoreSchema } from './mcp/store';
import type { PersistedCronState } from './cron/cron';
import type { HealthSettings } from './health/types';
import type { Message, RuntimeEvent, RuntimeInput } from './core/types';
import type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentRunStopReason,
} from '../../shared/agent/types';
import { toError } from '../ipc/core/error';

const DEFAULT_AGENT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };
const DEFAULT_SKILLS: SkillsSchema = { skills: {} };

const DEFAULT_HEALTH_SETTINGS: HealthSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};

const DEFAULT_MCP_SETTINGS: ConnectorStoreSchema = { mcpServers: {}, oauth: {} };

export interface AgentSendOptions {
	runId?: string;
	streamEvent?: (event: AgentResponseEvent) => void;
}

export class Agent {
	private readonly activeRuns = new Map<string, AbortController>();
	private readonly lastMessagesLimit = 50;
	private readonly cronStore: CronStore;
	private readonly skillsStore: SkillsStore;
	private isStarted = false;
	readonly config: Config;
	readonly settings: SettingsStore;
	readonly cron: Cron;
	readonly skills: Skills;
	readonly health: HealthStore;
	readonly mcp: McpStore;

	constructor() {
		this.config = new Config({ location: agentLocation() });
		this.settings = new SettingsStore(this.config, DEFAULT_AGENT_SETTINGS);
		this.cronStore = new CronStore(this.config, DEFAULT_CRON_STATE);
		this.skillsStore = new SkillsStore(this.config, DEFAULT_SKILLS);
		this.cron = new Cron(this.cronStore);
		this.skills = new Skills(this.config, this.skillsStore);
		this.health = new HealthStore(this.config, DEFAULT_HEALTH_SETTINGS);
		this.mcp = new McpStore(this.config, DEFAULT_MCP_SETTINGS);
	}

	start(logger: { error(scope: string, message: string, error?: unknown): void }): void {
		if (this.isStarted) return;
		this.isStarted = true;
		void this.cron.start().catch((error) => {
			logger.error('Cron', 'Failed to start persistent cron scheduler', error);
		});
	}

	destroy(): void {
		this.cron.destroy();
	}

	async send(message: string, agentId: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId.trim();

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();

		let response = '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();

			const input = {
				task: 'chat',
				message,
			} satisfies RuntimeInput;

			const session = new Session(this.config, input);

			const runner = new Runner(
				this.config,
				this.settings,
				this.cron,
				this.skills,
				this.mcp,
				session
			);

 			const stream = runner.run(input);
			
			this.activeRuns.set(resolvedAgentId, controller);

			for await (const event of stream) {
				// if (event.type === 'run_started')
				// 	providerId = event.providerId;
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(event, resolvedAgentId, runId)) {
					options.streamEvent?.(responseEvent);
				}
			}
			return response;
		} catch (error) {
			const cause = toError(error, 'Agent request failed.');
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: cause.message,
				agentId: resolvedAgentId,
				runId,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			throw cause;
		} finally {
			if (controller && this.activeRuns.get(resolvedAgentId) === controller)
				this.activeRuns.delete(resolvedAgentId);
		}
	}

	getLastMessages(sessionId: string): AgentHistoryMessage[] {
		return Session.loadMessages(sessionId, new Config({ location: 'main' }))
			.slice(-this.lastMessagesLimit)
			.flatMap(toHistoryMessages);
	}

	clearMessages(sessionId: string): void {
		Session.clearMessages(sessionId, new Config({ location: 'main' }));
	}

	cancel(agentId?: string): void {
		if (agentId) {
			this.activeRuns.get(agentId)?.abort();
			this.activeRuns.delete(agentId);
			return;
		}
		for (const controller of this.activeRuns.values()) controller.abort();
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return this.activeRuns.has(agentId);
	}
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'cancelled') return 'cancelled';
	if (value === 'error') return 'error';
	return 'end_turn';
}

function outputText(output: unknown): string {
	if (typeof output === 'string') return output;
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}

function toHistoryMessages(message: Message): AgentHistoryMessage[] {
	if (message.role === 'system') return [];

	const content = toTextContent(message.content);

	if (message.role === 'assistant') {
		const messages: AgentHistoryMessage[] = [
			{
				role: 'assistant',
				content,
				contentBlocks: toHistoryContentBlocks(message),
			},
		];
		for (const toolCall of message.toolCalls ?? []) {
			if (!toolCall.result) continue;
			const output = toTextContent(toolCall.result.content);
			const isError = toolCall.result.isError ?? output.startsWith('Error:');
			messages.push({
				role: 'tool',
				content: output,
				toolUseId: toolCall.id,
				isError,
				status: isError ? 'error' : 'ok',
				output,
			});
		}
		return messages;
	}

	return [{ role: 'user', content }];
}

function toHistoryContentBlocks(message: Message): AgentHistoryContentBlock[] {
	const blocks = Array.isArray(message.content)
		? message.content
			.map((block): AgentHistoryContentBlock | undefined => {
				if (block.type === 'text' && typeof block.text === 'string') {
					return { type: 'text', text: block.text };
				}
				return undefined;
			})
			.filter((block): block is AgentHistoryContentBlock => block !== undefined)
		: [];

	for (const toolCall of message.toolCalls ?? []) {
		blocks.push({
			type: 'tool_use',
			toolUseId: toolCall.id,
			toolName: toolCall.name,
			toolArgs: toolCall.args,
		});
	}

	return blocks;
}

function toTextContent(content: Message['content']): string {
	if (typeof content === 'string') return content;
	return content
		.map((block) => (block.type === 'text' && typeof block.text === 'string' ? block.text : ''))
		.filter(Boolean)
		.join('\n');
}

function runtimeEventToAgentEvents(
	event: RuntimeEvent,
	agentId: string,
	runId: string
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', model: event.model, effort: event.effort, agentId, runId }];
	}
	if (event.type === 'model_call_delta') {
		return [{ type: 'text_delta', delta: event.delta, agentId, runId }];
	}
	if (event.type === 'tool_call_start') {
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
			{
				type: 'tool_call_input',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				argsText: outputText(event.input),
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_call_end') {
		const status = event.isError ? 'error' : 'ok';
		return [
			{
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				output: event.output,
				outputText: outputText(event.output),
				status,
				durationMs: event.durationMs,
				errorText: event.isError ? outputText(event.output) : undefined,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'run_finished') {
		return [
			{
				type: 'run_finished',
				stopReason:
					event.result.subtype === 'error_max_turns'
						? 'max_iterations'
						: normalizeStopReason(event.result.stopReason),
				outputChars: event.result.text.length,
				agentId,
				runId,
			},
			{ type: 'run_state', state: 'completed', agentId, runId },
		];
	}
	return [];
}
