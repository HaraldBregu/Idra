import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { EventBus } from '../core/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import type { McpRegistry } from '../mcp';
import type { StoreService } from '../store';
import type { TasksService } from '../tasks';
import type { ConnectorsService } from '../connectors';
import { resolveBootstrapMode, type WorkspaceService } from '../workspace';
import {
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
	type AgentStartupFile,
	type AgentStartupFilesServicePort,
} from './startup-files';
import type { UserDataDirectoryServicePort } from '../user-data';
import { evaluateBeforeAgentRunHooks, type BeforeAgentRunHook } from './before-agent-run';
import { buildSystemPrompt } from './system-prompt';
import { type AgentRunHooks, type AgentRunStreamEvent } from './run';
import {
	buildAgentHookContext,
	fireBeforePromptBuildHook,
	resetRegisteredAgentHarnesses,
	runAgentHarnessAttempt,
} from './harness';
import { DEFAULT_AGENT_ID } from '../constants';
import { makeProvider, type ProviderSpec } from '../provider/factory';
import {
	PolicyService,
	type PolicyServicePort,
} from '../policy';
import type { ProviderAdapter, TranscriptEntry } from '../provider/types';
import {
	loadSession,
	loadExistingSession,
	listSessions,
	saveSession,
	clearSession,
	type SessionFile,
	type SessionStatus,
} from '../session/store';
import { AgentRunLogger, type RunLogFinish, type TokenUsage } from '../run-logger';
import { resolveDefaultUserDataPath } from '../user-data';
import {
	type AgentRunState,
	requireModelReasoningEffort,
	type ModelReasoningEffort,
	type OperatorStoreState,
} from '../../shared/agents/service';
import { isHeartbeatSystemPromptEnabled } from '../heartbeat/config';
import type { AgentConfig, AgentSessionMetadata, AgentToolPolicy } from '../../shared/store';
import type { SubagentSpawnPort } from './subagents';
import {
	ToolService,
	type AgentTool,
	type CronToolContext,
	type AgentToolSelectionForTurn,
	type ToolContext,
	type ToolServicePort,
} from '../tools';

const AGENT_TOOL_LIMITS = {
	maxTokens: 4096,
	maxIterations: 25,
	defaultMaxPromptTools: 9,
} as const;

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
	taskManager?: TasksService;
	subagents?: SubagentSpawnPort;
	policy?: PolicyServicePort;
	toolService?: ToolServicePort;
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
	toolContext: ToolContext;
	toolPolicy?: AgentToolPolicy;
	toolsAllow?: string[];
	toolsDeny?: string[];
}

export type AgentToolsFactory = (
	context: AgentToolsFactoryContext
) => AgentTool[] | Promise<AgentTool[]>;

export interface AgentServiceOptions {
	defaultAgentId?: string;
	providerFactory?: (provider: ProviderSpec) => ProviderAdapter;
	toolsFactory?: AgentToolsFactory;
	toolService?: ToolServicePort;
	runLoggerFactory?: (agentId: string) => AgentRunLogger;
	sessionBaseDir?: string;
	beforeAgentRunHooks?: BeforeAgentRunHook[];
}

export interface AgentSendOptions {
	runId?: string;
	cronContext?: CronToolContext;
	sessionId?: string;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	agentRuntime?: string;
	agentHarnessId?: string;
	lightContext?: boolean;
	toolsAllow?: string[];
	toolsDeny?: string[];
	sessionMetadata?: Partial<AgentSessionMetadata>;
	heartbeat?: {
		model?: string;
		timeoutSeconds?: number;
		lightContext?: boolean;
		suppressToolErrorWarnings?: boolean;
		suppressAgentEvents?: boolean;
	};
}

export interface AgentRunRecord {
	id: string;
	agentId: string;
	sessionId: string;
	state: AgentRunState;
	createdAt: string;
	updatedAt: string;
	providerId?: string;
	model?: string;
	label?: string;
	output?: string;
	error?: string;
}

export interface AgentCreateRunOptions {
	runId?: string;
	agentId?: string;
	sessionId?: string;
	providerId?: string;
	model?: string;
	state?: AgentRunState;
	sessionMetadata?: Partial<AgentSessionMetadata>;
}

export type AgentRunStatePatch = Partial<
	Pick<AgentRunRecord, 'state' | 'label' | 'output' | 'error' | 'providerId' | 'model'>
>;

export type AgentExecuteRunOptions = Omit<AgentSendOptions, 'runId' | 'sessionId'> & {
	deleteWhenDone?: boolean;
};

interface Runtime {
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

const SECONDARY_SESSION_CONTEXT_ALLOWLIST = new Set([
	'AGENTS.md',
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
]);

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
	private readonly toolService: ToolServicePort;
	private readonly policyService: PolicyServicePort;
	private readonly usesDefaultToolsFactory: boolean;
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
		this.policyService = dependencies.policy ?? new PolicyService({ logger: dependencies.logger });
		this.toolService =
			options.toolService ??
			dependencies.toolService ??
			new ToolService({
				policy: this.policyService,
				cron: dependencies.cron,
				logger: dependencies.logger,
			});
		this.usesDefaultToolsFactory = !options.toolsFactory;
		this.toolsFactory = options.toolsFactory ?? ((context) => this.createDefaultTools(context));
		this.runLoggerFactory = options.runLoggerFactory ?? ((id) => new AgentRunLogger(id));
		this.sessionBaseDir = options.sessionBaseDir;
		this.beforeAgentRunHooks = options.beforeAgentRunHooks ?? [];
		this.ensureRuntime(this.defaultAgentId);
	}

	private async createDefaultTools(context: AgentToolsFactoryContext): Promise<AgentTool[]> {
		const toolPolicy = context.toolPolicy;
		return this.toolService.createDefaultTools({
			toolPolicy,
			denylist: context.toolsDeny,
		});
	}

	async send(
		message: string,
		agentId = this.defaultAgentId,
		options: AgentSendOptions = {}
	): Promise<string> {
		const heartbeatOptions = options.heartbeat;
		const runtimeAgentId = options.sessionId ?? agentId;
		const runKind = heartbeatOptions
			? 'heartbeat'
			: options.cronContext?.role === 'cron-self'
				? 'cron'
				: 'default';
		const runtime = this.ensureRuntime(runtimeAgentId);
		if (runtime.currentAbort) {
			if (heartbeatOptions) {
				throw new Error(`Agent runtime is busy: ${runtimeAgentId}`);
			}
			runtime.currentAbort.abort();
		}

		const abort = new AbortController();
		runtime.currentAbort = abort;
		const timeoutMs =
			heartbeatOptions?.timeoutSeconds && heartbeatOptions.timeoutSeconds > 0
				? heartbeatOptions.timeoutSeconds * 1000
				: undefined;
		const runTimeout = timeoutMs ? setTimeout(() => abort.abort(), timeoutMs) : undefined;
		const clearRunTimeout = (): void => {
			if (runTimeout) clearTimeout(runTimeout);
		};
		const runId = randomUUID();
		const agentConfig = this.getConfiguredAgent(agentId);
		const streamEvent = (event: AgentRunStreamEvent): void => {
			if (heartbeatOptions?.suppressAgentEvents) return;
			this.dependencies.eventBus.broadcast('agent:response', {
				agentId: runtimeAgentId,
				runId,
				...event,
			});
		};
		const runStartedAt = Date.now();
		const phaseDurationsMs: Record<string, number> = {};

		try {
			const providerConfig = recordPhase(phaseDurationsMs, 'resolve_provider_model', () =>
				this.resolveProviderAndModel({
					providerId: options.providerId ?? agentConfig?.model?.providerId,
					model:
						options.model?.trim() || heartbeatOptions?.model?.trim() || agentConfig?.model?.modelId,
					effort: options.effort ?? agentConfig?.model?.effort,
				})
			);
			const providerId = providerConfig.providerId;
			const apiKey = providerConfig.apiKey;
			const model = providerConfig.model;
			const effort = providerConfig.effort;
			const baseURL = providerConfig.baseURL;
			const requestedRuntime = (options.agentRuntime || options.agentHarnessId || '').trim();
			const storedRuntime = this.dependencies.store.getAgentRuntimePreference?.() ?? undefined;
			runtime.session = await recordAsyncPhase(phaseDurationsMs, 'load_session', () =>
				loadSession(runtimeAgentId, model, providerId, {
					baseDir: this.sessionBaseDir,
				})
			);
			this.applyAgentSessionMetadata(runtime.session, agentId, options.sessionMetadata);
			const workspaceRoot = recordPhase(phaseDurationsMs, 'resolve_workspace', () =>
				this.workspaceRoot(agentConfig?.workspace)
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
				fsPolicy: {
					workspaceOnly: agentConfig?.tools?.fs?.workspaceOnly ?? false,
					writeWorkspaceOnly: agentConfig?.tools?.fs?.writeWorkspaceOnly,
					readOnly: agentConfig?.tools?.fs?.readOnly ?? false,
				},
				signal: abort.signal,
				services: this.dependencies,
			};
			const toolPolicy = recordPhase(phaseDurationsMs, 'evaluate_tool_policy', () =>
				this.policyService.evaluateToolRequest({ userRequest: message })
			);
			let bootstrapPending = await recordAsyncPhase(phaseDurationsMs, 'check_bootstrap', () =>
				this.isBootstrapPending(agentId)
			);
			const isPrimaryRun =
				runKind === 'default' && agentId === this.defaultAgentId && runtimeAgentId === agentId;
			let startupFiles: AgentStartupFile[] = [];
			let toolSelection: AgentToolSelectionForTurn = {
				toolsForPrompt: [],
				systemPromptSuffix: '',
				rankedTools: [],
			};
			let selectedTools: AgentTool[] = [];
			let baseTools: AgentTool[] = [];
			if (bootstrapPending || toolPolicy.shouldUseTools) {
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
							toolContext: ctx,
							toolPolicy: agentConfig?.tools,
							toolsAllow: options.toolsAllow,
							toolsDeny: options.toolsDeny,
						})
					)
				);
				if (!this.usesDefaultToolsFactory || options.toolsAllow) {
					baseTools = this.toolService.filterToolsByAllowlist(
						baseTools,
						options.toolsAllow,
						this.dependencies.policy
					);
				}
			}

			const directAnswer =
				!heartbeatOptions &&
				!bootstrapPending &&
				!toolPolicy.shouldUseTools;

			if (!directAnswer) {
				startupFiles = this.filterStartupFilesForRun(
					await recordAsyncPhase(phaseDurationsMs, 'load_startup_context', () =>
						this.loadStartupFiles(agentId)
					),
					{
						runKind,
						lightContext: heartbeatOptions?.lightContext === true || options.lightContext === true,
						includeHeartbeatContext: isHeartbeatSystemPromptEnabled(
							this.getOperatorConfig(),
							agentId
						),
						isPrimaryRun,
					}
				);
				bootstrapPending =
					bootstrapPending ||
					startupFiles.some((file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing);
				toolSelection =
					bootstrapPending && isPrimaryRun
						? {
								toolsForPrompt: [],
								systemPromptSuffix: '',
								rankedTools: [],
							}
						: recordPhase(phaseDurationsMs, 'select_tools', () =>
								this.toolService.selectToolsForTurn(
									baseTools,
									message,
									ctx,
									this.toolService.createManagementOptions({
										maxPromptTools: AGENT_TOOL_LIMITS.defaultMaxPromptTools,
									})
								)
				);
				selectedTools = toolSelection.toolsForPrompt;
			}
			selectedTools = this.toolService.prepareToolsForProvider(selectedTools, ctx, {
				provider: providerId,
				modelId: model,
			});
			const bootstrapMode = resolveBootstrapMode({
				bootstrapPending,
				isInteractiveUserFacing: true,
				isPrimaryRun,
				isCanonicalWorkspace: workspaceRoot === this.workspaceRoot(),
				hasBootstrapFileAccess: false,
				runKind,
			});
			startupFiles = this.filterStartupFilesForBootstrapMode(startupFiles, bootstrapMode);
			await recordAsyncPhase(phaseDurationsMs, 'before_prompt_build_hooks', () =>
				fireBeforePromptBuildHook({
					...buildAgentHookContext({
						runId,
						agentId,
						sessionId: runtime.session!.id,
						sessionKey: runtime.session!.id,
						provider: providerId,
						modelId: model,
					}),
				})
			);
			const systemPrompt = await recordAsyncPhase(phaseDurationsMs, 'build_system_prompt', () =>
				buildSystemPrompt({
					workspace: workspaceRoot,
					date: new Date().toISOString().slice(0, 10),
					model,
					tools: selectedTools,
					startupFiles,
					bootstrapMode,
					heartbeat: {
						includeSection:
							runKind === 'default' &&
							isHeartbeatSystemPromptEnabled(this.getOperatorConfig(), agentId),
					},
				})
			);
			const systemPromptForTurn = toolSelection.systemPromptSuffix
				? `${systemPrompt}\n\n${toolSelection.systemPromptSuffix}`
				: systemPrompt;

			const hooks = this.buildHooks(runtimeAgentId, {
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
				clearRunTimeout();
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

			const activeSession = runtime.session;
			if (!activeSession) {
				throw new Error('Agent session was not loaded.');
			}
			const result = await runAgentHarnessAttempt({
				runId,
				userMessage: message,
				systemPrompt: systemPromptForTurn,
				session: activeSession,
				provider: providerId,
				model,
				requestedRuntime,
				storedRuntime,
				providerAdapter: provider,
				effort,
				tools: selectedTools,
				ctx,
				streamEvent,
				streamOutput: (chunk) => streamEvent({ type: 'text_delta', delta: chunk }),
				maxTokens: AGENT_TOOL_LIMITS.maxTokens,
				maxIterations: AGENT_TOOL_LIMITS.maxIterations,
				hooks,
				signal: abort.signal,
				toolManagement: { enabled: false },
				toolService: this.toolService,
			});

			runtime.session = result.session;
			await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
			runtime.currentAbort = null;
			clearRunTimeout();
			streamEvent({
				type: 'run_state',
				state: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
				label: result.stopReason === 'cancelled' ? 'Cancelled' : 'Completed',
			});
			return result.finalText;
		} catch (err) {
			runtime.currentAbort = null;
			clearRunTimeout();
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
				agentId: runtimeAgentId,
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
		await resetRegisteredAgentHarnesses({
			sessionId: agentId,
			sessionKey: agentId,
			reason: 'reset',
		});
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

	cancel(agentId = this.defaultAgentId): void {
		const runtime = this.ensureRuntime(agentId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.currentAbort = null;
		}
	}

	isBusy(agentId = this.defaultAgentId): boolean {
		return Boolean(this.runtimes.get(agentId)?.currentAbort);
	}

	private ensureRuntime(agentId: string): Runtime {
		const existing = this.runtimes.get(agentId);
		if (existing) return existing;
		this.dependencies.logger.info('AgentService', `Creating agent runtime "${agentId}"`);
		const runtime: Runtime = {
			runLogger: this.runLoggerFactory(agentId),
			session: null,
			currentAbort: null,
		};
		this.runtimes.set(agentId, runtime);
		return runtime;
	}

	private getConfiguredAgent(agentId: string): AgentConfig | undefined {
		const store = this.dependencies.store as StoreService & {
			getAgentConfig?: (id: string) => AgentConfig | undefined;
		};
		return typeof store.getAgentConfig === 'function' ? store.getAgentConfig(agentId) : undefined;
	}

	private applyAgentSessionMetadata(
		session: SessionFile,
		agentId: string,
		metadata?: Partial<AgentSessionMetadata>
	): void {
		session.agentId = agentId;
		session.agentMetadata = {
			...session.agentMetadata,
			...metadata,
			agentId,
		};
	}

	private resolveProviderAndModel(
		overrides: {
			providerId?: string;
			model?: string;
			effort?: ModelReasoningEffort;
		} = {}
	): {
		providerId: string;
		apiKey: string;
		model: string;
		effort?: ModelReasoningEffort;
		baseURL?: string;
	} {
		const assistant = this.dependencies.store.getAssistantOperator();
		const configuredProviderId = assistant?.provider.id.trim().toLowerCase() ?? '';
		const configuredModel = assistant?.model.id.trim() || assistant?.model.name.trim() || '';
		const providerId = overrides.providerId?.trim().toLowerCase() || configuredProviderId;
		const model = overrides.model?.trim() || configuredModel;
		if (!providerId) throw new Error('Agent provider not configured.');
		if (!model) throw new Error('Agent model not configured.');
		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Provider not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
		const savedEffort = providerId === configuredProviderId ? assistant?.model.effort : undefined;
		let effort: ModelReasoningEffort | undefined;
		if (providerId === 'openai') {
			effort = requireModelReasoningEffort(model, overrides.effort ?? savedEffort, providerId);
		}
		return { providerId, apiKey, model, effort, baseURL: provider.baseUrl };
	}

	private tryResolveProviderAndModel(): { providerId: string; model: string } {
		try {
			const { providerId, model } = this.resolveProviderAndModel();
			return { providerId, model };
		} catch {
			return { providerId: 'unknown', model: 'unknown' };
		}
	}

	private workspaceRoot(workspaceOverride?: string): string {
		const override = workspaceOverride?.trim();
		if (override) {
			return path.isAbsolute(override) ? override : path.resolve(this.workspaceRoot(), override);
		}
		try {
			return this.dependencies.workspace.getRootPath();
		} catch {
			return resolveDefaultUserDataPath('workspace');
		}
	}

	private getOperatorConfig(): OperatorStoreState | undefined {
		const maybeStore = this.dependencies.store as {
			getOperator?: () => OperatorStoreState | undefined;
		};
		return typeof maybeStore.getOperator === 'function' ? maybeStore.getOperator() : undefined;
	}

	private async isBootstrapPending(agentId: string): Promise<boolean> {
		try {
			return await this.dependencies.startupFiles.isBootstrapPending(agentId);
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Bootstrap status unavailable', {
				error: (error as Error).message,
			});
			return false;
		}
	}

	private async loadStartupFiles(agentId: string): Promise<AgentStartupFile[]> {
		try {
			return await this.dependencies.startupFiles.loadContextFiles(agentId);
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Startup context unavailable', {
				error: (error as Error).message,
			});
		}
		return [];
	}

	private filterStartupFilesForRun(
		files: AgentStartupFile[],
		params: {
			runKind: 'default' | 'heartbeat' | 'cron';
			lightContext: boolean;
			includeHeartbeatContext: boolean;
			isPrimaryRun: boolean;
		}
	): AgentStartupFile[] {
		if (params.runKind === 'heartbeat') {
			return params.lightContext
				? files.filter((file) => file.name === DEFAULT_HEARTBEAT_FILENAME)
				: files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
		}
		if (!params.isPrimaryRun || params.runKind === 'cron') {
			return files.filter((file) => SECONDARY_SESSION_CONTEXT_ALLOWLIST.has(file.name));
		}
		if (params.runKind === 'default' && !params.includeHeartbeatContext) {
			return files.filter((file) => file.name !== DEFAULT_HEARTBEAT_FILENAME);
		}
		return files;
	}

	private filterStartupFilesForBootstrapMode(
		files: AgentStartupFile[],
		bootstrapMode: 'none' | 'limited' | 'full'
	): AgentStartupFile[] {
		if (bootstrapMode === 'full') return files;
		return files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
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
