import { randomUUID } from 'node:crypto';
import { Inject, Service } from 'typedi';
import { StoreService } from './core/store';
import { Session } from './session';
import { AgentRuntime } from './loop/loop';
import { AgentModel } from '../llm';
import { RuntimeEvent } from './index';
import { CronService } from '../cron';
import type { Cron } from './core/cron';
import type { Message, SessionCategory } from './core/types';
import type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentRunStopReason,
	ModelReasoningEffort,
} from '../../shared/agent/types';
import { toError } from '../ipc/core/error';
import { SkillsService } from './skills';

export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	category?: SessionCategory;
	effort?: ModelReasoningEffort;
	streamEvent?: (event: AgentResponseEvent) => void;
}

@Service()
export class AgentService {
	@Inject(() => StoreService)
	private readonly agentSettingsStore!: StoreService;

	@Inject(() => CronService)
	private readonly cron!: Cron;

	@Inject(() => SessionService)
	private readonly session!: SessionService;

	@Inject(() => SkillsService)
	private readonly skillsService!: SkillsService;

	private readonly activeRuns = new Map<string, AbortController>();
	private readonly lastMessagesLimit = 50;

	async send(message: string, agentId: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId.trim();

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();
		const sessionId = options.sessionId;

		let response = '';
		let controller: AbortController | undefined;
		let session: AgentSession | undefined;
		try {
			controller = new AbortController();
			const sessionInput = {
				task: 'chat',
				message,
				sessionId,
				effort: options.effort,
			};
			session = this.session.create(sessionInput, options.category);
			const settings = this.agentSettingsStore;
			const model = new AgentModel();
			const cron = this.cron;

			const runtime = new AgentRuntime(
				settings,
				session,
				model,
				cron,
				this.skillsService,
			);
			const input = {
				...sessionInput,
				maxRetries: 1,
				tools: [],
			};
			const stream = runtime.run(input);
			this.activeRuns.set(resolvedAgentId, controller);

			for await (const event of stream) {
				session.appendRun(event);
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
			if (session)
				session.appendRun({
					type: 'run_error',
					message: cause.message,
				});
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
		return this.session
			.loadMessages(sessionId)
			.slice(-this.lastMessagesLimit)
			.flatMap(toHistoryMessages);
	}

	clearMessages(sessionId: string): void {
		this.session.clearMessages(sessionId);
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
