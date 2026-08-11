import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
	clearMessages as clearSessionMessages,
	deleteSession as deleteStoredSession,
	createSessionState,
	init,
	listSessions,
	loadMessages,
	resolveSessionId,
	resolveStoredSessionId,
	tryAppendRun,
	type SessionState,
} from './session';
import { stream } from './runner/run_stream';
import { agentLocation } from '../shared/agent_location';
import { destroyTask, getRuntime, initTask, setTaskRunner, startTask } from '../tasks';
import { startHealth, stopHealth } from './health';
import { rejectPendingToolPermissions } from './permissions';
import { parseSkillCommand } from './skills';
import {
	createContextState,
	enqueueCommand,
	interruptCommands,
	type AgentCommand,
	type AgentContextState,
} from './context';
import type { Config, Message, RuntimeEvent, RuntimeInput } from './types';
import type {
	AgentRunOptions,
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentRunStopReason,
	AgentSessionSummary,
} from '../../shared/agent_types';
import { toError } from '../ipc/core/error';
import { AgentRunScheduler, type AgentRunPriority } from './agent_scheduler';
import type { WindowFactory } from '../window_factory';
import type { SessionCategory } from './session';
import { KeyedLimiter } from './limiter';
import { KeyedMutex } from './mutex';
import type { ExecSandbox } from './sandbox';

interface ActiveAgentRun {
	runId: string;
	agentId: string;
	sessionId: string;
	category: SessionCategory;
	windowId?: number;
	controller: AbortController;
	completion?: Promise<string>;
}

const RUN_PRIORITIES: Record<SessionCategory, AgentRunPriority> = {
	main: 'high',
	bot: 'normal',
	health: 'low',
	task: 'low',
	subagent: 'low',
};

const AGENT_CATEGORIES: Record<string, SessionCategory> = {
	main: 'main',
	channels: 'bot',
	tasks: 'task',
	health: 'health',
};

type AgentSendBaseOptions = Omit<AgentRunOptions, 'toolsAllow'> & {
	streaming?: boolean;
	modelId?: string;
	windowId?: number;
	streamEvent?: (event: AgentResponseEvent) => void;
};

export type AgentSendOptions =
	| (AgentSendBaseOptions & { type: 'default'; toolsAllow?: string[] })
	| (AgentSendBaseOptions & { type: 'background'; toolsAllow?: string[] });

type InternalAgentSendOptions = AgentSendOptions & { legacySessionId?: string };

export class Agent {
	private readonly activeRuns = new Map<string, ActiveAgentRun>();
	private readonly activeSessions = new Map<string, SessionState>();
	private readonly scheduler = new AgentRunScheduler(3);
	readonly resources = new KeyedMutex();
	private readonly providerLimiter = new KeyedLimiter(3);
	private readonly subagentLimiter = new KeyedLimiter(3);
	private readonly lastMessagesLimit = 50;
	private isStarted = false;
	readonly config: Config;
	readonly state: AgentContextState;

	constructor(
		private readonly windowFactory: WindowFactory,
		readonly sandbox: ExecSandbox
	) {
		this.config = { location: path.resolve(agentLocation()) };
		initTask();
		this.state = createContextState(createSessionState().context);
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
			const toolsAllow = schedule.action.toolsAllow;
			return this.send(schedule.action.prompt, 'tasks', {
				type: 'background',
				...(toolsAllow?.length ? { toolsAllow } : {}),
				streaming: false,
				contextMode: 'minimal',
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
		this.cancelAll();
		stopHealth();
		setTaskRunner(undefined);
		destroyTask();
		void this.sandbox.reset();
	}

	async send(message: string, agentId: string, options: AgentSendOptions): Promise<string> {
		const normalizedAgentId = agentId.trim();
		const category = AGENT_CATEGORIES[normalizedAgentId] ?? 'main';
		const sessionId = resolveSessionId(options.sessionId, this.config.location, category);
		const runId = options.runId ?? randomUUID();
		if (this.activeRuns.has(runId)) throw new Error(`Agent run '${runId}' is already active.`);
		const commandOptions: InternalAgentSendOptions = {
			...options,
			sessionId,
			...(options.sessionId && options.sessionId !== sessionId
				? { legacySessionId: options.sessionId }
				: {}),
		};
		const command: AgentCommand<InternalAgentSendOptions> = {
			id: runId,
			agentId: normalizedAgentId,
			message,
			options: commandOptions,
			queuedAt: Date.now(),
		};
		enqueueCommand(this.state, command);
		const controller = new AbortController();
		const active: ActiveAgentRun = {
			runId,
			agentId: command.agentId,
			sessionId,
			category,
			...(options.windowId === undefined ? {} : { windowId: options.windowId }),
			controller,
		};
		this.activeRuns.set(command.id, active);
		const run = this.scheduler.run(sessionId, () => this.process(command, controller), {
			priority: RUN_PRIORITIES[category],
			signal: controller.signal,
		});
		active.completion = run;
		const cleanup = () => {
			if (this.activeRuns.get(command.id) === active) this.activeRuns.delete(command.id);
		};
		void run.then(cleanup, cleanup);
		return run;
	}

	private async process(
		command: AgentCommand<InternalAgentSendOptions>,
		controller: AbortController
	): Promise<string> {
		if (!this.state.pending.includes(command)) return '';
		this.state.pending = this.state.pending.filter((candidate) => candidate !== command);
		const view = { id: command.id, agentId: command.agentId, message: command.message };
		const { options } = command;
		const category = AGENT_CATEGORIES[command.agentId] ?? 'main';
		const session = createSessionState();
		this.activeSessions.set(command.id, session);

		let response = '';
		try {
			if (controller.signal.aborted) return '';
			const parsedSkillCommand = parseSkillCommand(view.message);

			const baseInput = {
				runId: view.id,
				task: 'chat',
				message: parsedSkillCommand.message,
				agentId: view.agentId,
				contextMode:
					options.contextMode ??
					(options.lightContext === true || category !== 'main' ? 'minimal' : 'workspace'),
				...(options.effort ? { effort: options.effort } : {}),
				...(options.toolsDeny ? { toolsDeny: options.toolsDeny } : {}),
				...(options.files?.length ? { files: options.files } : {}),
				...(options.sessionId ? { sessionId: options.sessionId } : {}),
				...(options.legacySessionId ? { legacySessionId: options.legacySessionId } : {}),
				...(options.providerId ? { providerId: options.providerId } : {}),
				...((options.model ?? options.modelId) ? { model: options.model ?? options.modelId } : {}),
				...(options.windowId === undefined || options.streamEvent === undefined
					? {}
					: { approvalWindowId: options.windowId }),
				...(parsedSkillCommand.explicitSkill
					? { explicitSkill: parsedSkillCommand.explicitSkill }
					: {}),
			};
			const input: RuntimeInput =
				options.type === 'background'
					? {
							...baseInput,
							type: 'background',
							...(options.toolsAllow === undefined ? {} : { toolsAllow: options.toolsAllow }),
						}
					: {
							...baseInput,
							type: 'default',
							...(options.toolsAllow === undefined ? {} : { toolsAllow: options.toolsAllow }),
						};

			init(session, this.config, input, category);
			tryAppendRun(session, {
				type: 'run_queue_metrics',
				queueDelayMs: Date.now() - command.queuedAt,
			});

			const timeoutSignal = AbortSignal.timeout(10 * 60_000);
			const runSignal = AbortSignal.any([controller.signal, timeoutSignal]);
			const events = stream(this.config, session, input, runSignal, {
				streaming: options.streaming ?? true,
				windowFactory: this.windowFactory,
				resources: this.resources,
				sandbox: this.sandbox,
				providerLimiter: this.providerLimiter,
				subagentLimiter: this.subagentLimiter,
			});

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
			return response;
		} catch (error) {
			if (controller.signal.aborted) return response;
			const cause = toError(error, 'Agent request failed.');
			throw cause;
		} finally {
			this.activeSessions.delete(command.id);
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

	async clearMessages(sessionId: string): Promise<void> {
		const resolvedSessionId = resolveStoredSessionId(sessionId, this.config.location);
		await this.cancelSession(resolvedSessionId);
		await this.scheduler.run(
			resolvedSessionId,
			async () => {
				clearSessionMessages(createSessionState(), this.config, resolvedSessionId);
			},
			{ priority: 'high' }
		);
	}

	async deleteSession(sessionId: string): Promise<void> {
		const resolvedSessionId = resolveStoredSessionId(sessionId, this.config.location);
		await this.cancelSession(resolvedSessionId);
		await this.scheduler.run(
			resolvedSessionId,
			async () => {
				deleteStoredSession(createSessionState(), this.config, resolvedSessionId);
			},
			{ priority: 'high' }
		);
	}

	cancel(runId: string, windowId?: number): boolean {
		const active = this.activeRuns.get(runId);
		if (!active || (windowId !== undefined && active.windowId !== windowId)) return false;
		this.state.pending = this.state.pending.filter((command) => command.id !== runId);
		rejectPendingToolPermissions(runId);
		active.controller.abort(new DOMException('Run cancelled.', 'AbortError'));
		return true;
	}

	cancelAll(): void {
		rejectPendingToolPermissions();
		interruptCommands(this.state);
		for (const active of this.activeRuns.values()) {
			active.controller.abort(new DOMException('Application shutting down.', 'AbortError'));
		}
	}

	isBusy(agentId: string): boolean {
		return (
			[...this.activeRuns.values()].some((active) => active.agentId === agentId) ||
			this.state.pending.some((command) => command.agentId === agentId)
		);
	}

	runningSkill(): string | undefined {
		return [...this.activeSessions.values()].find((session) => session.context.skill)?.context
			.skill;
	}

	private async cancelSession(sessionId: string): Promise<void> {
		this.state.pending = this.state.pending.filter(
			(command) => (command.options as InternalAgentSendOptions).sessionId !== sessionId
		);
		const matching = [...this.activeRuns.entries()].filter(
			([, active]) => active.sessionId === sessionId
		);
		for (const [runId] of matching) {
			this.cancel(runId);
		}
		await Promise.allSettled(
			matching.map(([, active]) => active.completion).filter((run): run is Promise<string> => !!run)
		);
	}
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
	if (value === 'max_tool_calls') return 'max_tool_calls';
	if (value === 'budget_exhausted') return 'budget_exhausted';
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
	if (event.type === 'run_error') {
		return [{ type: 'run_state', state: 'error', label: event.message, agentId, runId }];
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
				targets: event.targets,
				expiresAt: event.expiresAt,
				inputFingerprint: event.inputFingerprint,
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
		];
	}
	return [];
}
