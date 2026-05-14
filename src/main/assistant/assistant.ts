import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import path from 'node:path';
import { MemoryManager } from './memory';
import { HitlBridge } from './hitl';
import { runAgent, type AgentRunHooks } from './agent/run';
import { buildSystemPrompt } from './agent/system-prompt';
import { loadSession, saveSession, clearSession, type SessionFile } from './session/store';
import { makeProvider } from './provider/factory';
import { ALL_TOOLS } from './tools/registry';
import type { ToolContext, FridayServices } from './tools/types';
import { AssistantRunLogger, type RunLogFinish, type TokenUsage } from './run-logger';
import type { CronService } from '../cron';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { McpRegistry } from '../mcp';
import type { StoreService } from '../store';
import type { WorkspaceService } from '../workspace';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 25;

export interface AssistantOverrides {
	providerFactory?: typeof makeProvider;
	runLogger?: AssistantRunLogger;
	sessionBaseDir?: string;
}

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export class Assistant {
	readonly id: string;
	readonly memory: MemoryManager;
	readonly hitl: HitlBridge;
	readonly runLogger: AssistantRunLogger;
	private readonly services: FridayServices;
	private readonly source: string;
	private readonly providerFactory: typeof makeProvider;
	private readonly sessionBaseDir?: string;
	private session: SessionFile | null = null;
	private initialized = false;
	private initPromise: Promise<void> | null = null;
	private currentAbort: AbortController | null = null;

	constructor(
		assistantId: string,
		store: StoreService,
		cron: CronService,
		logger: LoggerService,
		eventBus: EventBus,
		workspace: WorkspaceService,
		_mcpRegistry?: McpRegistry,
		overrides: AssistantOverrides = {}
	) {
		this.id = assistantId;
		this.services = { store, cron, eventBus, logger, workspace };
		this.source = `Assistant:${assistantId}`;
		this.memory = new MemoryManager(assistantId);
		this.hitl = new HitlBridge(eventBus, assistantId);
		this.runLogger = overrides.runLogger ?? new AssistantRunLogger(assistantId);
		this.providerFactory = overrides.providerFactory ?? makeProvider;
		this.sessionBaseDir = overrides.sessionBaseDir;
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			await this.memory.init();
			this.initialized = true;
		})();
		return this.initPromise;
	}

	private resolveProviderAndModel(): { providerId: string; apiKey: string; model: string; baseURL?: string } {
		const assistant = this.services.store.getAssistantService();
		const providerId = assistant?.provider.id.trim().toLowerCase() ?? '';
		const model = assistant?.model.id.trim() || assistant?.model.name.trim() || '';
		if (!providerId) throw new Error('Assistant provider not configured.');
		if (!model) throw new Error('Assistant model not configured.');
		const provider = this.services.store.getProviderById(providerId);
		if (!provider) throw new Error(`Provider not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
		return { providerId, apiKey, model, baseURL: undefined };
	}

	private async loadOrCreateSession(model: string, providerId: string): Promise<SessionFile> {
		return loadSession(this.id, model, providerId, { baseDir: this.sessionBaseDir });
	}

	private workspaceRoot(): string {
		try {
			return this.services.workspace.getRootPath();
		} catch {
			return path.join(app.getPath('userData'), 'workspace');
		}
	}

	private buildHooks(meta: { runId: string; providerId: string; model: string; tools: string[] }): AgentRunHooks {
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
				error: info.error ? { message: info.error.message, stack: info.error.stack } : undefined,
			});
		};
		return {
			onStart: async () => {
				await this.runLogger.logStart({
					runId: meta.runId,
					assistantId: this.id,
					provider: meta.providerId,
					model: meta.model,
					systemPromptChars: 0,
					userMessageChars: 0,
					tools: meta.tools,
					mcpToolCount: 0,
				});
			},
			onIteration: async (info) => {
				await this.runLogger.logIteration({
					runId: meta.runId,
					assistantId: this.id,
					iteration: info.iteration,
					usage: { inputTokens: info.usage.inputTokens, outputTokens: info.usage.outputTokens, totalTokens: info.usage.inputTokens + info.usage.outputTokens },
					durationMs: 0,
				});
			},
			onToolCall: async (info) => {
				await this.runLogger.logToolCall({
					runId: meta.runId,
					assistantId: this.id,
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
				await finish(status, {
					iterations: info.iterations,
					usage,
					outputChars: 0,
					durationMs: info.durationMs,
					error: info.error,
				});
			},
		};
	}

	/**
	 * Send a user message and stream the assistant's response back as text
	 * chunks via the `assistant:response` event bus channel. Returns the
	 * final concatenated text once the run terminates.
	 *
	 * A new send() cancels any in-flight run.
	 */
	async send(userMessage: string): Promise<string> {
		await this.init();
		if (this.currentAbort) {
			this.currentAbort.abort();
			this.hitl.cancelAll('user_continued');
		}
		const abort = new AbortController();
		this.currentAbort = abort;

		const runId = randomUUID();
		try {
			const { providerId, apiKey, model, baseURL } = this.resolveProviderAndModel();
			this.session = await this.loadOrCreateSession(model, providerId);
			const tools = ALL_TOOLS;
			const provider = this.providerFactory({ id: providerId, apiKey, baseURL }, model);
			const workspaceRoot = this.workspaceRoot();
			const systemPrompt = await buildSystemPrompt({
				workspace: workspaceRoot,
				date: new Date().toISOString().slice(0, 10),
				model,
				tools,
				memory: this.memory,
			});

			const ctx: ToolContext = {
				workspace: workspaceRoot,
				sessionId: this.session.id,
				readState: new Map(),
				plan: { entries: this.session.plan },
				approvalCache: new Set(),
				approvalRequired: new Set(),
				approveStream: this.hitl,
				elicit: { ask: (q, s) => this.hitl.askInput(q, s) },
				services: this.services,
			};

			const hooks = this.buildHooks({
				runId,
				providerId,
				model,
				tools: tools.map((t) => t.name),
			});

			this.services.logger.debug(this.source, `send -> model="${model}" provider="${providerId}"`);

			const streamOutput = (chunk: string): void => {
				this.services.eventBus.broadcast('assistant:response', {
					assistantId: this.id,
					runId,
					delta: chunk,
				});
			};

			const result = await runAgent({
				runId,
				userMessage,
				systemPrompt,
				session: this.session,
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

			this.session = result.session;
			await saveSession(this.session, { baseDir: this.sessionBaseDir });
			this.currentAbort = null;
			return result.finalText;
		} catch (err) {
			this.currentAbort = null;
			this.services.logger.error(this.source, 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			await this.runLogger.logFinish({
				runId,
				assistantId: this.id,
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

	/** Resolve a pending approval. */
	resolveApproval(id: string, approved: boolean): boolean {
		return this.hitl.resolveApproval(id, approved);
	}

	/** Resolve a pending input (ask_human answer). */
	resolveInput(id: string, answer: string): boolean {
		return this.hitl.resolveInput(id, answer);
	}

	/** Cancel the in-flight run and reject all pending approvals/inputs. */
	cancel(): void {
		if (this.currentAbort) {
			this.currentAbort.abort();
			this.currentAbort = null;
		}
		this.hitl.cancelAll('cancelled');
	}

	getPending(): ReturnType<HitlBridge['getPending']> {
		return this.hitl.getPending();
	}

	async getHistory(): Promise<SessionFile['transcript']> {
		await this.init();
		if (!this.session) {
			const { providerId, model } = (() => {
				try {
					return this.resolveProviderAndModel();
				} catch {
					return { providerId: 'unknown', model: 'unknown' };
				}
			})();
			this.session = await this.loadOrCreateSession(model, providerId);
		}
		return [...this.session.transcript];
	}

	async reset(): Promise<void> {
		this.cancel();
		this.services.logger.info(this.source, 'reset');
		await clearSession(this.id, { baseDir: this.sessionBaseDir });
		await this.memory.clear();
		this.session = null;
		this.initialized = false;
		this.initPromise = null;
		await this.init();
	}
}
