import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent, type RunHooks, type RunOutcome } from './loop';
import {
	RunState,
	type PendingApproval,
	type PendingInputRequest,
} from './run-state';
import {
	AssistantRunLogger,
	type RunLogFinish,
	type TokenUsage,
} from './run-logger';
import { defaultTools } from './tools';
import type { Tool } from './tools/base';
import { MAX_ITERATIONS } from './constants';
import type { CronService } from '../cron';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { McpRegistry } from '../mcp';
import type { StoreService } from '../store';
import type { WorkspaceService } from '../workspace';

export type AssistantOpenAIFactory = (apiKey: string) => OpenAI;

export interface AssistantOverrides {
	openAIFactory?: AssistantOpenAIFactory;
	runLogger?: AssistantRunLogger;
	toolsFactory?: (deps: {
		cron: CronService;
		store: StoreService;
		eventBus: EventBus;
		logger: LoggerService;
		workspace: WorkspaceService;
	}) => Tool[];
}

export interface SendResult {
	status: 'completed' | 'awaiting_approval' | 'awaiting_input' | 'max_iterations' | 'cancelled';
	text: string;
	pending: PendingApproval[];
	pendingInputs: PendingInputRequest[];
}

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export class Assistant {
	readonly id: string;
	readonly memory: MemoryManager;
	readonly session: SessionManager;
	readonly runLogger: AssistantRunLogger;
	private readonly store: StoreService;
	private readonly logger: LoggerService;
	private readonly cron: CronService;
	private readonly eventBus: EventBus;
	private readonly workspace: WorkspaceService;
	private readonly mcpRegistry?: McpRegistry;
	private readonly source: string;
	private readonly openAIFactory: AssistantOpenAIFactory;
	private readonly toolsFactory: NonNullable<AssistantOverrides['toolsFactory']>;
	private history: ChatCompletionMessageParam[] = [];
	private cachedKey: string | null = null;
	private cachedClient: OpenAI | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private pendingRun: RunState | null = null;

	constructor(
		assistantId: string,
		store: StoreService,
		cron: CronService,
		logger: LoggerService,
		eventBus: EventBus,
		workspace: WorkspaceService,
		mcpRegistry?: McpRegistry,
		overrides: AssistantOverrides = {}
	) {
		this.id = assistantId;
		this.store = store;
		this.logger = logger;
		this.cron = cron;
		this.eventBus = eventBus;
		this.workspace = workspace;
		this.mcpRegistry = mcpRegistry;
		this.source = `Assistant:${assistantId}`;
		this.memory = new MemoryManager(assistantId);
		this.session = new SessionManager(`assistant:${assistantId}`);
		this.runLogger = overrides.runLogger ?? new AssistantRunLogger(assistantId);
		this.openAIFactory = overrides.openAIFactory ?? ((apiKey) => new OpenAI({ apiKey }));
		this.toolsFactory = overrides.toolsFactory ?? defaultTools;
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			await this.memory.init();
			await this.session.init();
			this.history = await this.session.load();
			this.initialized = true;
		})();
		return this.initPromise;
	}

	private client(apiKey: string): OpenAI {
		if (apiKey !== this.cachedKey) {
			this.cachedKey = apiKey;
			this.cachedClient = this.openAIFactory(apiKey);
		}
		return this.cachedClient!;
	}

	private assistantConfig(): { apiKey: string; model: string; providerId: string } {
		const assistant = this.store.getAssistantService();
		const providerId = assistant?.provider.id.trim().toLowerCase() ?? '';
		const model = assistant?.model.id.trim() || assistant?.model.name.trim() || '';

		if (!providerId) {
			throw new Error('Assistant provider not configured. Select a provider in Settings.');
		}

		const provider = this.store.getProviderById(providerId);
		if (!provider) {
			throw new Error(`Assistant provider "${assistant?.provider.id}" is not configured.`);
		}

		const apiKey = provider.apiKey.trim();
		if (!apiKey) {
			throw new Error(
				`API key not configured for assistant provider "${provider.id}". Add it in Settings.`
			);
		}
		if (!model) {
			throw new Error('Assistant model not configured. Select a model in Settings.');
		}

		return { apiKey, model, providerId };
	}

	private historyToInput(history: readonly ChatCompletionMessageParam[]): ResponseInputItem[] {
		const input: ResponseInputItem[] = [];
		for (const message of history) {
			if (message.role !== 'user' && message.role !== 'assistant') continue;
			const content = typeof message.content === 'string' ? message.content : '';
			if (!content) continue;
			input.push({ type: 'message', role: message.role, content });
		}
		return input;
	}

	private buildHooks(meta: {
		runId: string;
		providerId: string;
		model: string;
		tools: Tool[];
		systemPrompt: string;
		userMessage: string;
		mcpToolCount: number;
	}): RunHooks {
		const finish = async (
			status: RunLogFinish['status'],
			info: {
				iterations: number;
				usage: TokenUsage;
				outputChars: number;
				durationMs: number;
				error?: Error;
			}
		): Promise<void> => {
			await this.runLogger.logFinish({
				runId: meta.runId,
				assistantId: this.id,
				provider: meta.providerId,
				model: meta.model,
				status,
				iterations: info.iterations,
				durationMs: info.durationMs,
				usage: info.usage,
				outputChars: info.outputChars,
				error: info.error
					? { message: info.error.message, stack: info.error.stack }
					: undefined,
			});
		};

		return {
			onStart: async () => {
				await this.runLogger.logStart({
					runId: meta.runId,
					assistantId: this.id,
					provider: meta.providerId,
					model: meta.model,
					systemPromptChars: meta.systemPrompt.length,
					userMessageChars: meta.userMessage.length,
					tools: meta.tools.map((t) => t.name),
					mcpToolCount: meta.mcpToolCount,
				});
			},
			onIteration: async (info) => {
				await this.runLogger.logIteration({
					runId: meta.runId,
					assistantId: this.id,
					iteration: info.iteration,
					usage: info.usage,
					durationMs: info.durationMs,
				});
			},
			onToolCall: async (info) => {
				await this.runLogger.logToolCall({
					runId: meta.runId,
					assistantId: this.id,
					iteration: info.iteration,
					callId: info.callId,
					tool: info.tool,
					arguments: info.arguments,
					durationMs: info.durationMs,
					status: info.status === 'input_resolved' ? 'ok' : info.status,
					outputChars: info.outputChars,
				});
			},
			onApprovalRequest: async (info) => {
				await this.runLogger.logApprovalRequest({
					runId: meta.runId,
					assistantId: this.id,
					iteration: info.iteration,
					pending: info.pending.map((p) => ({
						callId: p.callId,
						tool: p.toolName,
						arguments: p.arguments,
					})),
				});
				this.eventBus.broadcast('assistant:pending', {
					assistantId: this.id,
					runId: meta.runId,
					pending: info.pending,
					pendingInputs: [],
				});
			},
			onInputRequest: async (info) => {
				await this.runLogger.logInputRequest({
					runId: meta.runId,
					assistantId: this.id,
					iteration: info.iteration,
					pending: info.pending.map((p) => ({
						callId: p.callId,
						tool: p.toolName,
						question: p.question,
					})),
				});
				this.eventBus.broadcast('assistant:pending', {
					assistantId: this.id,
					runId: meta.runId,
					pending: [],
					pendingInputs: info.pending,
				});
			},
			onFinish: async (info) => {
				await finish(info.status, info);
			},
		};
	}

	private outcomeToResult(outcome: RunOutcome): SendResult {
		if (outcome.status === 'done') {
			return {
				status: 'completed',
				text: outcome.text,
				pending: [],
				pendingInputs: [],
			};
		}
		if (outcome.status === 'awaiting_approval' || outcome.status === 'awaiting_input') {
			return {
				status: outcome.status,
				text: outcome.text,
				pending: outcome.pending,
				pendingInputs: outcome.pendingInputs,
			};
		}
		return {
			status: 'max_iterations',
			text: outcome.text,
			pending: [],
			pendingInputs: [],
		};
	}

	private async runFromState(state: RunState): Promise<SendResult> {
		const { apiKey, model, providerId } = this.assistantConfig();
		const systemPrompt = state.data.systemPrompt ?? (await buildSystemPrompt(this.memory));
		state.data.systemPrompt = systemPrompt;
		state.data.provider = providerId;
		state.data.model = model;
		const tools = this.toolsFactory({
			cron: this.cron,
			store: this.store,
			eventBus: this.eventBus,
			logger: this.logger,
			workspace: this.workspace,
		});
		const mcpTools = this.mcpRegistry?.buildTools(this.store.getConnectors()) ?? [];
		const hooks = this.buildHooks({
			runId: state.data.runId,
			providerId,
			model,
			tools,
			systemPrompt,
			userMessage: state.data.userMessage,
			mcpToolCount: mcpTools.length,
		});

		this.logger.debug(this.source, `runFromState -> model="${model}" iter=${state.data.iteration}`);

		const outcome: RunOutcome = await runAgent({
			client: this.client(apiKey),
			model,
			tools,
			mcpTools,
			state,
			maxIterations: MAX_ITERATIONS,
			hooks,
		});

		if (outcome.status === 'awaiting_approval' || outcome.status === 'awaiting_input') {
			this.pendingRun = outcome.state;
			return this.outcomeToResult(outcome);
		}

		this.pendingRun = null;
		await this.session.append(outcome.newMessages);
		this.history.push(...outcome.newMessages);
		return this.outcomeToResult(outcome);
	}

	/**
	 * Drop the current paused run (if any). Logs a `cancelled` finish event so
	 * the run-log audit trail stays complete. Safe to call when nothing is
	 * pending.
	 */
	async cancelPending(reason: 'user_continued' | 'explicit' = 'explicit'): Promise<void> {
		if (!this.pendingRun) return;
		const state = this.pendingRun;
		this.pendingRun = null;
		this.logger.info(this.source, `cancelPending (${reason}) runId=${state.data.runId}`);
		await this.runLogger.logFinish({
			runId: state.data.runId,
			assistantId: this.id,
			provider: state.data.provider ?? 'unknown',
			model: state.data.model ?? 'unknown',
			status: 'cancelled',
			iterations: state.data.iteration,
			durationMs: 0,
			usage: emptyUsage(),
			outputChars: 0,
		});
		this.eventBus.broadcast('assistant:pending', {
			assistantId: this.id,
			runId: state.data.runId,
			pending: [],
			pendingInputs: [],
		});
	}

	async send(userMessage: string): Promise<string> {
		await this.init();
		// A new user prompt implicitly cancels any in-flight HITL pause.
		if (this.pendingRun) {
			await this.cancelPending('user_continued');
		}
		try {
			const systemPrompt = await buildSystemPrompt(this.memory);
			const initialMessages: ChatCompletionMessageParam[] = userMessage
				? [{ role: 'user', content: userMessage }]
				: [];
			const input = this.historyToInput(this.history);
			if (userMessage) input.push({ type: 'message', role: 'user', content: userMessage });

			const state = RunState.initial({
				runId: randomUUID(),
				userMessage,
				systemPrompt,
				input,
				newMessages: initialMessages,
			});

			const result = await this.runFromState(state);
			return result.text;
		} catch (err) {
			this.logger.error(this.source, 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			throw err;
		}
	}

	getPendingApprovals(): PendingApproval[] {
		return this.pendingRun?.pending() ?? [];
	}

	getPendingInputs(): PendingInputRequest[] {
		return this.pendingRun?.pendingInputs() ?? [];
	}

	hasPending(): boolean {
		return this.pendingRun !== null;
	}

	async approve(
		callId: string,
		opts: { alwaysApprove?: boolean; editedArguments?: string } = {}
	): Promise<SendResult> {
		const state = this.requirePending();
		const tool = state.pending().find((p) => p.callId === callId)?.toolName ?? 'unknown';
		state.approve(callId, opts);
		await this.runLogger.logApprovalResolution({
			runId: state.data.runId,
			assistantId: this.id,
			callId,
			tool,
			decision: 'approve',
			alwaysApply: opts.alwaysApprove ?? false,
			editedArguments: opts.editedArguments,
		});
		return this.resumeIfReady();
	}

	async reject(
		callId: string,
		opts: { alwaysReject?: boolean; message?: string } = {}
	): Promise<SendResult> {
		const state = this.requirePending();
		const tool = state.pending().find((p) => p.callId === callId)?.toolName ?? 'unknown';
		state.reject(callId, opts);
		await this.runLogger.logApprovalResolution({
			runId: state.data.runId,
			assistantId: this.id,
			callId,
			tool,
			decision: 'reject',
			alwaysApply: opts.alwaysReject ?? false,
		});
		return this.resumeIfReady();
	}

	async respond(callId: string, answer: string): Promise<SendResult> {
		const state = this.requirePending();
		const tool = state.pendingInputs().find((p) => p.callId === callId)?.toolName ?? 'unknown';
		state.recordInputResponse(callId, answer);
		await this.runLogger.logInputResolution({
			runId: state.data.runId,
			assistantId: this.id,
			callId,
			tool,
			answerChars: answer.length,
		});
		return this.resumeIfReady();
	}

	private requirePending(): RunState {
		if (!this.pendingRun) throw new Error(`No pending approvals for assistant "${this.id}".`);
		return this.pendingRun;
	}

	private async resumeIfReady(): Promise<SendResult> {
		const state = this.requirePending();
		const stillApprovals = state
			.pending()
			.filter((p) => !state.decisionFor(p.callId, p.toolName));
		const stillInputs = state
			.pendingInputs()
			.filter((p) => state.inputResponseFor(p.callId) === undefined);
		if (stillApprovals.length > 0 || stillInputs.length > 0) {
			return {
				status: stillApprovals.length > 0 ? 'awaiting_approval' : 'awaiting_input',
				text: `Awaiting human input for ${stillApprovals.length + stillInputs.length} item(s).`,
				pending: stillApprovals,
				pendingInputs: stillInputs,
			};
		}
		return this.runFromState(state);
	}

	async getHistory(): Promise<ChatCompletionMessageParam[]> {
		await this.init();
		return [...this.history];
	}

	async reset(): Promise<void> {
		this.logger.info(this.source, 'reset');
		this.pendingRun = null;
		await this.session.clear();
		await this.memory.clear();
		this.history = [];
		this.initialized = false;
		this.initPromise = null;
		await this.init();
	}
}
