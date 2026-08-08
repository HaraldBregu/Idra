import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
	clearMessages as clearSessionMessages,
	deleteSession as deleteStoredSession,
	createSessionState,
	init,
	listSessions,
	loadMessages,
	type SessionCategory,
	type SessionState,
} from './session';
import { stream } from './run/run_stream';
import { agentLocation } from '../shared/agent_location';
import { destroyTask, getRuntime, initTask, setTaskRunner, startTask } from '../tasks';
import { startHealth, stopHealth } from './health';
import { rejectPendingToolPermissions } from './policy';
import { resolveSkillCommand } from './skills';
import {
	agentView,
	beginCommand,
	createContextState,
	enqueueCommand,
	finishCommand,
	interruptCommands,
	type AgentCommand,
	type AgentContextState,
} from './context';
import type { Config, Message, RuntimeEvent, RuntimeInput } from './types';
import type {
	AgentRunOptions,
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentInputFile,
	AgentResponseEvent,
	AgentRunStopReason,
	AgentPermissionMode,
	AgentSessionSummary,
} from '../../shared/agent_types';
import { toError } from '../ipc/core/error';

export interface AgentSendOptions extends AgentRunOptions {
	interactive?: boolean;
	category?: SessionCategory;
	modelId?: string;
	streamEvent?: (event: AgentResponseEvent) => void;
}

export class Agent {
	private readonly activeRuns = new Map<string, AbortController>();
	private readonly lastMessagesLimit = 50;
	private isStarted = false;
	private queue: Promise<unknown> = Promise.resolve();
	readonly config: Config;
	readonly session: SessionState;
	readonly state: AgentContextState;

	constructor() {
		this.config = { location: path.resolve(agentLocation()) };
		initTask();
		this.session = createSessionState();
		this.state = createContextState(this.session.context);
	}

	start(logger: {
		info(scope: string, message: string, data?: unknown): void;
		error(scope: string, message: string, error?: unknown): void;
	}): void {
		if (this.isStarted) return;
		this.isStarted = true;
		setTaskRunner((schedule) => {
			if (schedule.action.type !== 'agent') return Promise.resolve('');
			const runtime = getRuntime();
			return this.send(schedule.action.prompt, 'tasks', {
				category: 'task',
				interactive: false,
				contextMode: 'minimal',
				toolsAllow: schedule.action.toolsAllow,
				effort: schedule.action.effort,
				...(runtime ? { providerId: runtime.providerId, modelId: runtime.modelId } : {}),
			});
		});
		void startTask().catch((error) => {
			logger.error('Task', 'Failed to start persistent tasks scheduler', error);
		});
		startHealth(this, logger);
	}

	destroy(): void {
		stopHealth();
		setTaskRunner(undefined);
		destroyTask();
	}

	async send(message: string, agentId: string, options: AgentSendOptions = {}): Promise<string> {
		const command: AgentCommand<AgentSendOptions> = {
			id: options.runId ?? randomUUID(),
			agentId: agentId.trim(),
			message,
			options,
			queuedAt: Date.now(),
		};
		enqueueCommand(this.state, command);
		const run = this.queue.then(() => this.process(command));
		this.queue = run.catch(() => undefined);
		return run;
	}

	private async process(command: AgentCommand<AgentSendOptions>): Promise<string> {
		if (!this.state.pending.includes(command)) return '';
		beginCommand(this.state, command);
		const view = agentView(this.state);
		const { options } = command;
		const origin = options.category ?? 'main';

		let response = '';
		let controller: AbortController | undefined;
		try {
			controller = new AbortController();

			const input = {
				runId: view.id,
				task: 'chat',
				message: resolveSkillCommand(view.message),
				origin,
				contextMode:
					options.contextMode ?? (options.lightContext === true || origin !== 'main' ? 'minimal' : 'workspace'),
				...(options.effort ? { effort: options.effort } : {}),
				...(options.toolsAllow ? { toolsAllow: options.toolsAllow } : {}),
				...(options.toolsDeny ? { toolsDeny: options.toolsDeny } : {}),
				...(options.files?.length ? { files: options.files } : {}),
				...(options.sessionId ? { sessionId: options.sessionId } : {}),
				...(options.providerId ? { providerId: options.providerId } : {}),
				...(options.model ?? options.modelId ? { model: options.model ?? options.modelId } : {}),
			} satisfies RuntimeInput;

			init(this.session, this.config, input, options.category);

			const events = stream(this.config, this.session, input, controller.signal, {
				interactive: options.interactive ?? true,
			});

			this.activeRuns.set(view.agentId, controller);

			const streamingToolArgs = new Map<string, { name: string; argsText: string }>();
			for await (const event of events) {
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;

				for (const responseEvent of runtimeEventToAgentEvents(
					event,
					view.agentId,
					view.id,
					streamingToolArgs
				)) {
					options.streamEvent?.(responseEvent);
				}
			}
			finishCommand(this.state, command);
			return response;
		} catch (error) {
			// A cancelled run ends quietly instead of surfacing an error.
			if (controller?.signal.aborted) {
				finishCommand(this.state, command);
				return response;
			}
			const cause = toError(error, 'Agent request failed.');
			finishCommand(this.state, command);
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: cause.message,
				agentId: view.agentId,
				runId: view.id,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			throw cause;
		} finally {
			if (controller && this.activeRuns.get(view.agentId) === controller)
				this.activeRuns.delete(view.agentId);
		}
	}

	listSessions(): AgentSessionSummary[] {
		return listSessions(this.config.location);
	}

	getLastMessages(sessionId: string): AgentHistoryMessage[] {
		return loadMessages(this.config, sessionId)
			.slice(-this.lastMessagesLimit)
			.flatMap(toHistoryMessages);
	}

	clearMessages(sessionId: string): void {
		clearSessionMessages(this.session, this.config, sessionId);
	}

	deleteSession(sessionId: string): void {
		deleteStoredSession(this.session, this.config, sessionId);
	}

	cancel(agentId?: string): void {
		rejectPendingToolPermissions();
		interruptCommands(this.state, agentId);
		if (agentId) {
			this.activeRuns.get(agentId)?.abort();
			this.activeRuns.delete(agentId);
			return;
		}
		for (const controller of this.activeRuns.values()) controller.abort();
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return (
			this.activeRuns.has(agentId) ||
			this.state.pending.some((command) => command.agentId === agentId)
		);
	}

	runningSkill(): string | undefined {
		return this.session.context.skill;
	}
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'max_tool_calls') return 'max_tool_calls';
	if (value === 'timeout') return 'timeout';
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
	if (
		Array.isArray(message.content) &&
		message.content.length > 0 &&
		message.content.every((block) => block.internal === true)
	)
		return [];

	const content = toTextContent(message.content);

	if (message.role === 'assistant') {
		const messages: AgentHistoryMessage[] = [
			{
				role: 'assistant',
				content,
				contentBlocks: toHistoryContentBlocks(message),
				...(message.usage ? { usage: message.usage } : {}),
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
	runId: string,
	streamingToolArgs: Map<string, { name: string; argsText: string }>
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', model: event.model, effort: event.effort, agentId, runId }];
	}
	if (event.type === 'model_tool_call_start') {
		streamingToolArgs.set(event.id, { name: event.name, argsText: '' });
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.id,
				toolName: event.name,
				name: event.name,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'model_tool_call_args_delta') {
		const pending = streamingToolArgs.get(event.id);
		if (!pending) return [];
		pending.argsText += event.jsonDelta;
		return [
			{
				type: 'tool_call_args_delta',
				iteration: 0,
				toolCallId: event.id,
				toolName: pending.name,
				jsonDelta: event.jsonDelta,
				argsText: pending.argsText,
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'model_call_end') {
		return [{ type: 'model_usage', usage: event.usage, agentId, runId }];
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
	if (event.type === 'tool_permission_request') {
		return [
			{
				type: 'tool_permission_request',
				approvalId: event.approvalId,
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				input: event.input,
				mode: 'ask',
				risk: event.risk,
				effect: event.effect,
				targets: event.targets,
				hardApproval: event.hardApproval,
				expiresAt: event.expiresAt,
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
		const stopReason = normalizeStopReason(event.result.stopReason);
		return [
			{
				type: 'run_finished',
				stopReason,
				outputChars: event.result.text.length,
				usage: event.result.usage,
				agentId,
				runId,
			},
			{
				type: 'run_state',
				state: stopReason === 'cancelled' ? 'cancelled' : 'completed',
				agentId,
				runId,
			},
		];
	}
	return [];
}
