import { randomUUID } from 'node:crypto';
import type { EventBus } from './core/event-bus';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { StoreService } from './store';
import type { ConnectorsService } from './connectors';
import {
	resolveBootstrapMode,
	type WorkspaceService,
} from './workspace';
import {
	DEFAULT_BOOTSTRAP_FILENAME,
	type AgentStartupFile,
	type AgentStartupFilesServicePort,
} from './agent/startup-files';
import type { UserDataDirectoryServicePort } from './user-data';
import { evaluateBeforeAgentRunHooks, type BeforeAgentRunHook } from './agent/before-agent-run';
import { buildSystemPrompt } from './agent/system-prompt';
import { runAgent, type AgentRunHooks, type AgentRunStreamEvent } from './agent/run';
import { DEFAULT_AGENT_ID } from './constants';
import { HitlBridge } from './hitl';
import { makeProvider, type ProviderSpec } from './provider/factory';
import type { ProviderAdapter, TranscriptEntry } from './provider/types';
import { loadSession, saveSession, clearSession, type SessionFile } from './session/store';
import { createTools } from './tools/registry';
import {
	selectAgentToolsForTurn,
	ToolUsePolicy,
	type AgentToolSelectionForTurn,
} from './tools/management';
import type { AgentTool, ToolContext } from './tools/types';
import { AgentRunLogger, type RunLogFinish, type TokenUsage } from './run-logger';
import { resolveDefaultUserDataPath } from './user-data';
import type { SkillsService } from './skills';
import type { SkillPromptChoice } from './skills/types';
import type { ApprovalDecision } from '../shared/service';
import type { OpenClawCronActor } from './cron';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 25;
const DEFAULT_MAX_PROMPT_TOOLS = 6;
const BOOTSTRAP_TOOL_NAMES = new Set(['startup_files']);

export interface AgentServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
	startupFiles: AgentStartupFilesServicePort;
	userDataDirectory: UserDataDirectoryServicePort;
	connectors?: ConnectorsService;
	mcpRegistry?: McpRegistry;
	skills?: SkillsService;
}

export interface AgentToolsFactoryContext {
	agentId: string;
	runId: string;
	providerId: string;
	model: string;
	workspace: string;
	session: SessionFile;
	signal: AbortSignal;
	services: AgentServiceDependencies;
}

export type AgentToolsFactory = (
	context: AgentToolsFactoryContext
) => AgentTool[] | Promise<AgentTool[]>;

export interface AgentServiceOptions {
	defaultAgentId?: string;
	providerFactory?: (provider: ProviderSpec) => ProviderAdapter;
	toolsFactory?: AgentToolsFactory;
	runLoggerFactory?: (agentId: string) => AgentRunLogger;
	sessionBaseDir?: string;
	beforeAgentRunHooks?: BeforeAgentRunHook[];
}

interface Runtime {
	hitl: HitlBridge;
	runLogger: AgentRunLogger;
	session: SessionFile | null;
	currentAbort: AbortController | null;
}

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function startupContextChars(files: AgentStartupFile[]): number {
	return files.reduce((total, file) => total + (file.content?.length ?? 0), 0);
}

function recordPhase<T>(durations: Record<string, number>, name: string, work: () => T): T {
	const start = Date.now();
	try {
		return work();
	} finally {
		durations[name] = Date.now() - start;
	}
}

async function recordAsyncPhase<T>(
	durations: Record<string, number>,
	name: string,
	work: () => Promise<T>
): Promise<T> {
	const start = Date.now();
	try {
		return await work();
	} finally {
		durations[name] = Date.now() - start;
	}
}

export class AgentService {
	private readonly defaultAgentId: string;
	private readonly providerFactory: (provider: ProviderSpec) => ProviderAdapter;
	private readonly toolsFactory: AgentToolsFactory;
	private readonly runLoggerFactory: (agentId: string) => AgentRunLogger;
	private readonly sessionBaseDir?: string;
	private readonly beforeAgentRunHooks: BeforeAgentRunHook[];
	private readonly runtimes = new Map<string, Runtime>();

	constructor(
		private readonly dependencies: AgentServiceDependencies,
		options: AgentServiceOptions = {}
	) {
		this.defaultAgentId = options.defaultAgentId ?? DEFAULT_AGENT_ID;
		this.providerFactory = options.providerFactory ?? makeProvider;
		this.toolsFactory =
			options.toolsFactory ??
			(() => [
				...createTools({ profile: 'full', allow: [], deny: [] }),
				...(this.dependencies.connectors?.createAgentTools() ?? []),
			]);
		this.runLoggerFactory = options.runLoggerFactory ?? ((id) => new AgentRunLogger(id));
		this.sessionBaseDir = options.sessionBaseDir;
		this.beforeAgentRunHooks = options.beforeAgentRunHooks ?? [];
		this.ensureRuntime(this.defaultAgentId);
	}

	async send(
		message: string,
		agentId = this.defaultAgentId,
		options: { cronContext?: OpenClawCronActor } = {}
	): Promise<string> {
		const runtime = this.ensureRuntime(agentId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.hitl.cancelAll('user_continued');
		}

		const abort = new AbortController();
		runtime.currentAbort = abort;
		const runId = randomUUID();
		const streamEvent = (event: AgentRunStreamEvent): void => {
			this.dependencies.eventBus.broadcast('agent:response', {
				agentId,
				runId,
				...event,
			});
		};
		const runStartedAt = Date.now();
		const phaseDurationsMs: Record<string, number> = {};

		try {
			const { providerId, apiKey, model, baseURL } = recordPhase(
				phaseDurationsMs,
				'resolve_provider_model',
				() => this.resolveProviderAndModel()
			);
			runtime.session = await recordAsyncPhase(phaseDurationsMs, 'load_session', () =>
				loadSession(agentId, model, providerId, {
					baseDir: this.sessionBaseDir,
				})
			);
			const workspaceRoot = recordPhase(phaseDurationsMs, 'resolve_workspace', () =>
				this.workspaceRoot()
			);
			const provider = recordPhase(phaseDurationsMs, 'create_provider', () =>
				this.providerFactory({ id: providerId, apiKey, baseURL })
			);
			const ctx: ToolContext = {
				workspace: workspaceRoot,
				agentId,
				cronContext: options.cronContext ?? {
					role: agentId === this.defaultAgentId ? 'owner' : 'subagent',
					agentId,
				},
				sessionId: runtime.session.id,
				sessionBaseDir: this.sessionBaseDir,
				sessionVisibility: 'agent',
				readState: new Map(),
				plan: { entries: runtime.session.plan },
				approvalCache: new Set(),
				approvalRequired: new Set(),
				elicit: {
					ask: (question, suggestions) => {
						streamEvent({
							type: 'run_state',
							state: 'waiting_for_approval',
							label: 'Waiting for input',
						});
						return runtime.hitl.askInput(question, suggestions);
					},
				},
				services: this.dependencies,
			};
			const toolPolicy = recordPhase(phaseDurationsMs, 'evaluate_tool_policy', () =>
				new ToolUsePolicy().evaluate({ userRequest: message })
			);
			let bootstrapPending = await recordAsyncPhase(phaseDurationsMs, 'check_bootstrap', () =>
				this.isBootstrapPending()
			);
				let startupFiles: AgentStartupFile[] = [];
			let toolSelection: AgentToolSelectionForTurn = {
				toolsForPrompt: [],
				systemPromptSuffix: '',
				rankedTools: [],
			};
			let selectedTools: AgentTool[] = [];
			let baseTools: AgentTool[] = [];
			let skillChoices: SkillPromptChoice[] = [];

			if (bootstrapPending || toolPolicy.shouldUseTools || this.dependencies.skills) {
				baseTools = await recordAsyncPhase(phaseDurationsMs, 'build_tools', () =>
					Promise.resolve(
						this.toolsFactory({
							agentId,
							runId,
							providerId,
							model,
							workspace: workspaceRoot,
							session: runtime.session!,
							signal: abort.signal,
							services: this.dependencies,
						})
					)
				);

				if (!bootstrapPending && this.dependencies.skills) {
					skillChoices = await recordAsyncPhase(phaseDurationsMs, 'discover_skills', () =>
						this.dependencies.skills!.discoverForPrompt(message, {
							userId: agentId,
							sessionId: runtime.session!.id,
							tools: baseTools,
							toolContext: ctx,
							signal: abort.signal,
						})
					);
				}
			}

			const directAnswer = !bootstrapPending && !toolPolicy.shouldUseTools && skillChoices.length === 0;

			if (!directAnswer) {
					startupFiles = await recordAsyncPhase(phaseDurationsMs, 'load_startup_context', () =>
						this.loadStartupFiles(agentId)
					);
					bootstrapPending =
						bootstrapPending ||
						startupFiles.some((file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing);
				toolSelection = bootstrapPending
					? {
							toolsForPrompt: baseTools.filter((tool) => BOOTSTRAP_TOOL_NAMES.has(tool.name)),
							systemPromptSuffix: '',
							rankedTools: [],
						}
					: recordPhase(phaseDurationsMs, 'select_tools', () =>
							selectAgentToolsForTurn(baseTools, message, ctx, {
								forceSelection: true,
								maxPromptTools: DEFAULT_MAX_PROMPT_TOOLS,
							})
						);
				selectedTools = toolSelection.toolsForPrompt;

				if (skillChoices.length > 0 && this.dependencies.skills) {
					const selectedNames = new Set(selectedTools.map((tool) => tool.name));
					const requiredSkillToolNames = new Set(
						skillChoices.flatMap((skill) => skill.requiredTools)
					);
					for (const tool of baseTools) {
						if (requiredSkillToolNames.has(tool.name) && !selectedNames.has(tool.name)) {
							selectedTools.push(tool);
							selectedNames.add(tool.name);
						}
					}
					selectedTools = selectedTools.filter((tool) => tool.name !== 'execute_skill');
					selectedTools.push(
						this.dependencies.skills.createExecutionTool({
							userId: agentId,
							sessionId: runtime.session.id,
							tools: selectedTools,
							connectors: [],
							signal: abort.signal,
						})
					);
				}
			}
			const selectedToolNames = new Set(selectedTools.map((tool) => tool.name));
			const bootstrapMode = resolveBootstrapMode({
				bootstrapPending,
				isInteractiveUserFacing: true,
					isPrimaryRun: agentId === this.defaultAgentId,
					isCanonicalWorkspace: workspaceRoot === this.workspaceRoot(),
					hasBootstrapFileAccess: selectedToolNames.has('startup_files'),
				});
			const systemPrompt = await recordAsyncPhase(phaseDurationsMs, 'build_system_prompt', () =>
				buildSystemPrompt({
					workspace: workspaceRoot,
					date: new Date().toISOString().slice(0, 10),
						model,
						tools: selectedTools,
						skills: skillChoices,
						startupFiles,
						bootstrapMode,
					})
			);
			const systemPromptForTurn = toolSelection.systemPromptSuffix
				? `${systemPrompt}\n\n${toolSelection.systemPromptSuffix}`
				: systemPrompt;

			const hooks = this.buildHooks(agentId, {
				runId,
				providerId,
				model,
				tools: selectedTools.map((tool) => tool.name),
				runLogger: runtime.runLogger,
				systemPromptChars: systemPromptForTurn.length,
				userMessageChars: message.length,
				directAnswer,
				bootstrapPending,
					toolPolicyReason: toolPolicy.reason,
					workspaceContextChars: startupContextChars(startupFiles),
					prepStartedAt: runStartedAt,
					phaseDurationsMs,
				});
			const beforeRun = await evaluateBeforeAgentRunHooks(this.beforeAgentRunHooks, {
				prompt: message,
				messages: [...runtime.session.transcript, { role: 'user', content: message }],
				systemPrompt: systemPromptForTurn,
				senderId: agentId,
				senderIsOwner: agentId === this.defaultAgentId,
			});
			if (beforeRun.outcome === 'block') {
				await hooks.onStart?.({ runId });
				runtime.session.transcript.push({
					role: 'assistant',
					content: [{ type: 'text', text: beforeRun.message }],
				});
				runtime.session = {
					...runtime.session,
					status: 'completed',
				};
				await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
				runtime.currentAbort = null;
				streamEvent({ type: 'text_delta', delta: beforeRun.message });
				streamEvent({
					type: 'run_state',
					state: 'completed',
					label: 'beforeAgentRunBlocked',
				});
				await hooks.onFinish?.({
					runId,
					stopReason: 'end_turn',
					usage: emptyUsage(),
					iterations: 0,
					durationMs: Date.now() - runStartedAt,
					outputChars: beforeRun.message.length,
				});
				return beforeRun.message;
			}

			const result = await runAgent({
				runId,
				userMessage: message,
				systemPrompt: systemPromptForTurn,
				session: runtime.session,
				provider,
				model,
				tools: selectedTools,
				ctx,
				maxTokens: DEFAULT_MAX_TOKENS,
				maxIterations: DEFAULT_MAX_ITERATIONS,
				streamEvent,
				hooks,
				signal: abort.signal,
				toolManagement: { enabled: false },
			});

			runtime.session = result.session;
			await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
			runtime.currentAbort = null;
			streamEvent({
				type: 'run_state',
				state: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
				label: result.stopReason === 'cancelled' ? 'Cancelled' : 'Completed',
			});
			return result.finalText;
		} catch (err) {
			runtime.currentAbort = null;
			streamEvent({
				type: 'run_state',
				state: abort.signal.aborted ? 'cancelled' : 'error',
				label: abort.signal.aborted ? 'Cancelled' : (err as Error).message,
			});
			this.dependencies.logger.error('AgentService', 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			await runtime.runLogger.logFinish({
				runId,
				agentId,
				provider: 'unknown',
				model: 'unknown',
				status: 'error',
				iterations: 0,
				durationMs: Date.now() - runStartedAt,
				usage: emptyUsage(),
				outputChars: 0,
				error: { message: (err as Error).message, stack: (err as Error).stack },
			});
			throw err;
		}
	}

	async reset(agentId = this.defaultAgentId): Promise<void> {
		const runtime = this.ensureRuntime(agentId);
		this.cancel(agentId);
		this.dependencies.logger.info('AgentService', `reset "${agentId}"`);
		await clearSession(agentId, { baseDir: this.sessionBaseDir });
		runtime.session = null;
	}

	async getHistory(agentId = this.defaultAgentId): Promise<TranscriptEntry[]> {
		const runtime = this.ensureRuntime(agentId);
		if (!runtime.session) {
			const { providerId, model } = this.tryResolveProviderAndModel();
			runtime.session = await loadSession(agentId, model, providerId, {
				baseDir: this.sessionBaseDir,
			});
		}
		return [...runtime.session.transcript];
	}

	resolveApproval(
		id: string,
		decision: ApprovalDecision | boolean,
		agentId = this.defaultAgentId
	): boolean {
		return this.ensureRuntime(agentId).hitl.resolveApproval(id, decision);
	}

	resolveInput(id: string, answer: string, agentId = this.defaultAgentId): boolean {
		return this.ensureRuntime(agentId).hitl.resolveInput(id, answer);
	}

	cancel(agentId = this.defaultAgentId): void {
		const runtime = this.ensureRuntime(agentId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.currentAbort = null;
		}
		runtime.hitl.cancelAll('cancelled');
	}

	getPending(agentId = this.defaultAgentId): ReturnType<HitlBridge['getPending']> {
		return this.ensureRuntime(agentId).hitl.getPending();
	}

	private ensureRuntime(agentId: string): Runtime {
		const existing = this.runtimes.get(agentId);
		if (existing) return existing;
		this.dependencies.logger.info('AgentService', `Creating agent runtime "${agentId}"`);
		const runtime: Runtime = {
			hitl: new HitlBridge(this.dependencies.eventBus, agentId),
			runLogger: this.runLoggerFactory(agentId),
			session: null,
			currentAbort: null,
		};
		this.runtimes.set(agentId, runtime);
		return runtime;
	}

	private resolveProviderAndModel(): {
		providerId: string;
		apiKey: string;
		model: string;
		baseURL?: string;
	} {
		const agent = this.dependencies.store.getAgentService();
		const providerId = agent?.provider.id.trim().toLowerCase() ?? '';
		const model = agent?.model.id.trim() || agent?.model.name.trim() || '';
		if (!providerId) throw new Error('Agent provider not configured.');
		if (!model) throw new Error('Agent model not configured.');
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
			return resolveDefaultUserDataPath('workspace');
		}
	}

	private async isBootstrapPending(): Promise<boolean> {
		const workspace = this.dependencies.workspace as Partial<WorkspaceService>;
		try {
			if (typeof workspace.isBootstrapPending === 'function') {
				return await workspace.isBootstrapPending();
			}
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Bootstrap status unavailable', {
				error: (error as Error).message,
			});
		}
		return false;
	}

	private async loadWorkspaceFiles(): Promise<WorkspaceContextFile[]> {
		const workspace = this.dependencies.workspace as Partial<WorkspaceService>;
		try {
			if (typeof workspace.ensureReady === 'function') {
				await workspace.ensureReady();
			}
			if (typeof workspace.loadContextFiles === 'function') {
				return await workspace.loadContextFiles();
			}
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Workspace context unavailable', {
				error: (error as Error).message,
			});
		}
		return [];
	}

	private buildHooks(
		agentId: string,
		meta: {
			runId: string;
			providerId: string;
			model: string;
			tools: string[];
			runLogger: AgentRunLogger;
			systemPromptChars: number;
			userMessageChars: number;
			directAnswer: boolean;
			bootstrapPending: boolean;
			toolPolicyReason: string;
			workspaceContextChars: number;
			prepStartedAt: number;
			phaseDurationsMs: Record<string, number>;
		}
	): AgentRunHooks {
		return {
			onStart: async () => {
				await meta.runLogger.logStart({
					runId: meta.runId,
					agentId,
					provider: meta.providerId,
					model: meta.model,
					systemPromptChars: meta.systemPromptChars,
					userMessageChars: meta.userMessageChars,
					tools: meta.tools,
					mcpToolCount: 0,
					directAnswer: meta.directAnswer,
					bootstrapPending: meta.bootstrapPending,
					toolPolicyReason: meta.toolPolicyReason,
					workspaceContextChars: meta.workspaceContextChars,
					prepDurationMs: Date.now() - meta.prepStartedAt,
					phaseDurationsMs: { ...meta.phaseDurationsMs },
				});
			},
			onIteration: async (info) => {
				await meta.runLogger.logIteration({
					runId: meta.runId,
					agentId,
					iteration: info.iteration,
					usage: {
						inputTokens: info.usage.inputTokens,
						outputTokens: info.usage.outputTokens,
						totalTokens: info.usage.inputTokens + info.usage.outputTokens,
					},
					durationMs: info.durationMs,
				});
			},
			onToolCall: async (info) => {
				await meta.runLogger.logToolCall({
					runId: meta.runId,
					agentId,
					iteration: info.iteration,
					callId: info.callId,
					tool: info.tool,
					arguments: JSON.stringify(info.args ?? {}),
					durationMs: info.durationMs,
					status: info.status,
					outputChars: info.outputChars,
					outputText: info.outputText,
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
					agentId,
					provider: meta.providerId,
					model: meta.model,
					status,
					iterations: info.iterations,
					durationMs: info.durationMs,
					usage,
					outputChars: info.outputChars,
					firstTokenLatencyMs: info.firstTokenLatencyMs,
					error: info.error ? { message: info.error.message, stack: info.error.stack } : undefined,
				});
			},
		};
	}
}
