import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import { MemoryManager, buildSystemPrompt } from './memory';
import { SessionManager } from './session';
import { runAgent, type RunHooks, type RunOutcome } from './loop';
import { RunState, type PendingApproval } from './run-state';
import { AssistantRunLogger, type RunLogFinish, type TokenUsage } from './run-logger';
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
	status: 'completed' | 'awaiting_approval' | 'max_iterations';
	text: string;
	pending: PendingApproval[];
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
					status: info.status,
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
				});
			},
			onFinish: async (info) => {
				await finish(info.status, info);
			},
		};
	}

	private async runFromState(state: RunState): Promise<SendResult> {
		const { apiKey, model, providerId } = this.assistantConfig();
		const systemPrompt = state.data.systemPrompt ?? (await buildSystemPrompt(this.memory));
		state.data.systemPrompt = systemPrompt;
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

		if (outcome.status === 'awaiting_approval') {
			this.pendingRun = outcome.state;
			return { status: 'awaiting_approval', text: outcome.text, pending: outcome.pending };
		}

		this.pendingRun = null;
		await this.session.append(outcome.newMessages);
		this.history.push(...outcome.newMessages);
		const status: SendResult['status'] =
			outcome.status === 'done' ? 'completed' : outcome.status;
		return { status, text: outcome.text, pending: [] };
	}

	async send(userMessage: string): Promise<string> {
		await this.init();
		if (this.pendingRun) {
			throw new Error(
				`Assistant "${this.id}" has pending approvals. Call approve()/reject() before send().`
			);
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

	hasPending(): boolean {
		return this.pendingRun !== null;
	}

	async approve(
		callId: string,
		opts: { alwaysApprove?: boolean } = {}
	): Promise<SendResult> {
		const state = this.requirePending();
		state.approve(callId, opts);
		await this.runLogger.logApprovalResolution({
			runId: state.data.runId,
			assistantId: this.id,
			callId,
			tool: state.pending().find((p) => p.callId === callId)?.toolName ?? 'unknown',
			decision: 'approve',
			alwaysApply: opts.alwaysApprove ?? false,
		});
		return this.resumeIfReady();
	}

	async reject(
		callId: string,
		opts: { alwaysReject?: boolean; message?: string } = {}
	): Promise<SendResult> {
		const state = this.requirePending();
		state.reject(callId, opts);
		await this.runLogger.logApprovalResolution({
			runId: state.data.runId,
			assistantId: this.id,
			callId,
			tool: state.pending().find((p) => p.callId === callId)?.toolName ?? 'unknown',
			decision: 'reject',
			alwaysApply: opts.alwaysReject ?? false,
		});
		return this.resumeIfReady();
	}

	private requirePending(): RunState {
		if (!this.pendingRun) throw new Error(`No pending approvals for assistant "${this.id}".`);
		return this.pendingRun;
	}

	private async resumeIfReady(): Promise<SendResult> {
		const state = this.requirePending();
		const stillPending = state
			.pending()
			.filter((p) => !state.decisionFor(p.callId, p.toolName));
		if (stillPending.length > 0) {
			return {
				status: 'awaiting_approval',
				text: `Awaiting human approval for ${stillPending.length} tool call(s).`,
				pending: stillPending,
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
