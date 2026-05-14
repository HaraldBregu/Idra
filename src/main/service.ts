import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { app } from 'electron';
import type { EventBus } from './core/event-bus';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { StoreService } from './store';
import type { WorkspaceService } from './workspace';
import { buildSystemPrompt } from './agent/system-prompt';
import { runAgent, type AgentRunHooks } from './agent/run';
import { DEFAULT_ASSISTANT_ID } from './constants';
import { HitlBridge } from './hitl';
import { makeProvider, type ProviderSpec } from './provider/factory';
import type { ProviderAdapter, TranscriptEntry } from './provider/types';
import { loadSession, saveSession, clearSession, type SessionFile } from './session/store';
import { createTools } from './tools/registry';
import type { AgentTool, ToolContext } from './tools/types';
import { AssistantRunLogger, type RunLogFinish, type TokenUsage } from './run-logger';
import type { ApprovalDecision } from '../shared/service';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 25;

export interface AssistantServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
	mcpRegistry?: McpRegistry;
}

export interface AssistantServiceOptions {
	defaultAssistantId?: string;
	providerFactory?: (provider: ProviderSpec, model: string) => ProviderAdapter;
	toolsFactory?: () => AgentTool[];
	runLoggerFactory?: (assistantId: string) => AssistantRunLogger;
	sessionBaseDir?: string;
}

interface Runtime {
	hitl: HitlBridge;
	runLogger: AssistantRunLogger;
	session: SessionFile | null;
	currentAbort: AbortController | null;
}

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export class AssistantService {
	private readonly defaultAssistantId: string;
	private readonly providerFactory: (provider: ProviderSpec, model: string) => ProviderAdapter;
	private readonly toolsFactory: () => AgentTool[];
	private readonly runLoggerFactory: (assistantId: string) => AssistantRunLogger;
	private readonly sessionBaseDir?: string;
	private readonly runtimes = new Map<string, Runtime>();

	constructor(
		private readonly dependencies: AssistantServiceDependencies,
		options: AssistantServiceOptions = {}
	) {
		this.defaultAssistantId = options.defaultAssistantId ?? DEFAULT_ASSISTANT_ID;
		this.providerFactory = options.providerFactory ?? makeProvider;
		this.toolsFactory =
			options.toolsFactory ??
			(() => createTools({ profile: 'full', allow: [], deny: [] }));
		this.runLoggerFactory = options.runLoggerFactory ?? ((id) => new AssistantRunLogger(id));
		this.sessionBaseDir = options.sessionBaseDir;
		this.ensureRuntime(this.defaultAssistantId);
	}

	async send(message: string, assistantId = this.defaultAssistantId): Promise<string> {
		const runtime = this.ensureRuntime(assistantId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.hitl.cancelAll('user_continued');
		}

		const abort = new AbortController();
		runtime.currentAbort = abort;
		const runId = randomUUID();

		try {
			const { providerId, apiKey, model, baseURL } = this.resolveProviderAndModel();
			runtime.session = await loadSession(assistantId, model, providerId, {
				baseDir: this.sessionBaseDir,
			});
			const tools = this.toolsFactory();
			const provider = this.providerFactory({ id: providerId, apiKey, baseURL }, model);
			const workspaceRoot = this.workspaceRoot();
			const systemPrompt = await buildSystemPrompt({
				workspace: workspaceRoot,
				date: new Date().toISOString().slice(0, 10),
				model,
				tools,
			});

			const ctx: ToolContext = {
				workspace: workspaceRoot,
				sessionId: runtime.session.id,
				readState: new Map(),
				plan: { entries: runtime.session.plan },
				approvalCache: new Set(),
				approvalRequired: new Set(),
				approveStream: runtime.hitl,
				elicit: { ask: (question, suggestions) => runtime.hitl.askInput(question, suggestions) },
				services: this.dependencies,
			};

			const hooks = this.buildHooks(assistantId, {
				runId,
				providerId,
				model,
				tools: tools.map((tool) => tool.name),
				runLogger: runtime.runLogger,
			});

			const streamOutput = (chunk: string): void => {
				this.dependencies.eventBus.broadcast('assistant:response', {
					assistantId,
					runId,
					delta: chunk,
				});
			};

			const result = await runAgent({
				runId,
				userMessage: message,
				systemPrompt,
				session: runtime.session,
				provider,
				model,
				tools,
				ctx,
				maxTokens: DEFAULT_MAX_TOKENS,
				maxIterations: DEFAULT_MAX_ITERATIONS,
				streamOutput,
				hooks,
				signal: abort.signal,
			});

			runtime.session = result.session;
			await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
			runtime.currentAbort = null;
			return result.finalText;
		} catch (err) {
			runtime.currentAbort = null;
			this.dependencies.logger.error('AssistantService', 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			await runtime.runLogger.logFinish({
				runId,
				assistantId,
				provider: 'unknown',
				model: 'unknown',
				status: 'error',
				iterations: 0,
				durationMs: 0,
				usage: emptyUsage(),
				outputChars: 0,
				error: { message: (err as Error).message, stack: (err as Error).stack },
			});
			throw err;
		}
	}

	async reset(assistantId = this.defaultAssistantId): Promise<void> {
		const runtime = this.ensureRuntime(assistantId);
		this.cancel(assistantId);
		this.dependencies.logger.info('AssistantService', `reset "${assistantId}"`);
		await clearSession(assistantId, { baseDir: this.sessionBaseDir });
		runtime.session = null;
	}

	async getHistory(assistantId = this.defaultAssistantId): Promise<TranscriptEntry[]> {
		const runtime = this.ensureRuntime(assistantId);
		if (!runtime.session) {
			const { providerId, model } = this.tryResolveProviderAndModel();
			runtime.session = await loadSession(assistantId, model, providerId, {
				baseDir: this.sessionBaseDir,
			});
		}
		return [...runtime.session.transcript];
	}

	resolveApproval(
		id: string,
		decision: ApprovalDecision | boolean,
		assistantId = this.defaultAssistantId
	): boolean {
		return this.ensureRuntime(assistantId).hitl.resolveApproval(id, decision);
	}

	resolveInput(id: string, answer: string, assistantId = this.defaultAssistantId): boolean {
		return this.ensureRuntime(assistantId).hitl.resolveInput(id, answer);
	}

	cancel(assistantId = this.defaultAssistantId): void {
		const runtime = this.ensureRuntime(assistantId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.currentAbort = null;
		}
		runtime.hitl.cancelAll('cancelled');
	}

	getPending(assistantId = this.defaultAssistantId): ReturnType<HitlBridge['getPending']> {
		return this.ensureRuntime(assistantId).hitl.getPending();
	}

	private ensureRuntime(assistantId: string): Runtime {
		const existing = this.runtimes.get(assistantId);
		if (existing) return existing;
		this.dependencies.logger.info('AssistantService', `Creating assistant runtime "${assistantId}"`);
		const runtime: Runtime = {
			hitl: new HitlBridge(this.dependencies.eventBus, assistantId),
			runLogger: this.runLoggerFactory(assistantId),
			session: null,
			currentAbort: null,
		};
		this.runtimes.set(assistantId, runtime);
		return runtime;
	}

	private resolveProviderAndModel(): { providerId: string; apiKey: string; model: string; baseURL?: string } {
		const assistant = this.dependencies.store.getAssistantService();
		const providerId = assistant?.provider.id.trim().toLowerCase() ?? '';
		const model = assistant?.model.id.trim() || assistant?.model.name.trim() || '';
		if (!providerId) throw new Error('Assistant provider not configured.');
		if (!model) throw new Error('Assistant model not configured.');
		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Provider not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
		return { providerId, apiKey, model, baseURL: provider.baseUrl };
	}

	private tryResolveProviderAndModel(): { providerId: string; model: string } {
		try {
			const { providerId, model } = this.resolveProviderAndModel();
			return { providerId, model };
		} catch {
			return { providerId: 'unknown', model: 'unknown' };
		}
	}

	private workspaceRoot(): string {
		try {
			return this.dependencies.workspace.getRootPath();
		} catch {
			return path.join(app.getPath('userData'), 'workspace');
		}
	}

	private buildHooks(
		assistantId: string,
		meta: {
			runId: string;
			providerId: string;
			model: string;
			tools: string[];
			runLogger: AssistantRunLogger;
		}
	): AgentRunHooks {
		return {
			onStart: async () => {
				await meta.runLogger.logStart({
					runId: meta.runId,
					assistantId,
					provider: meta.providerId,
					model: meta.model,
					systemPromptChars: 0,
					userMessageChars: 0,
					tools: meta.tools,
					mcpToolCount: 0,
				});
			},
			onIteration: async (info) => {
				await meta.runLogger.logIteration({
					runId: meta.runId,
					assistantId,
					iteration: info.iteration,
					usage: {
						inputTokens: info.usage.inputTokens,
						outputTokens: info.usage.outputTokens,
						totalTokens: info.usage.inputTokens + info.usage.outputTokens,
					},
					durationMs: 0,
				});
			},
			onToolCall: async (info) => {
				await meta.runLogger.logToolCall({
					runId: meta.runId,
					assistantId,
					iteration: info.iteration,
					callId: info.callId,
					tool: info.tool,
					arguments: JSON.stringify(info.args ?? {}),
					durationMs: info.durationMs,
					status: info.status,
					outputChars: info.outputChars,
				});
			},
			onFinish: async (info) => {
				const status: RunLogFinish['status'] =
					info.stopReason === 'cancelled'
						? 'cancelled'
						: info.stopReason === 'end_turn'
							? 'completed'
							: info.stopReason === 'max_iterations'
								? 'max_iterations'
								: info.stopReason === 'error'
									? 'error'
									: 'completed';
				const usage: TokenUsage = {
					inputTokens: info.usage.inputTokens,
					outputTokens: info.usage.outputTokens,
					totalTokens: info.usage.inputTokens + info.usage.outputTokens,
				};
				await meta.runLogger.logFinish({
					runId: meta.runId,
					assistantId,
					provider: meta.providerId,
					model: meta.model,
					status,
					iterations: info.iterations,
					durationMs: info.durationMs,
					usage,
					outputChars: 0,
					error: info.error ? { message: info.error.message, stack: info.error.stack } : undefined,
				});
			},
		};
	}
}
