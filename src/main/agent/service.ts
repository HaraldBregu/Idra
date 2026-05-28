import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { EventBus } from '../core/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../logger';
import type { McpRegistry } from '../mcp';
import type { StoreService } from '../store';
import type { TasksService } from '../tasks';
import type { ConnectorsService } from '../connectors';
import type { SkillsService } from '../skills';
import type { ChannelRegistry, ChannelsService } from '../channels';
import {
	resolveBootstrapMode,
	WorkspaceService,
	type WorkspaceContextFile,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
} from '../workspace';
import type { UserDataDirectoryServicePort } from '../user-data';
import { evaluateBeforeAgentRunHooks, type BeforeAgentRunHook } from './before-agent-run';
import { buildSystemPrompt } from './system-prompt';
import {
	AgentExecutionService,
	type AgentExecutionServicePort,
	type AgentRunHooks,
} from './run';
import type { AgentResponseEvent, AgentRunStreamEvent } from '../../shared/agents/events';
import { AgentCapabilityService, type AgentCapabilityServicePort } from './capabilities';
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
	type Model,
	requireModelReasoningEffort,
	type ModelReasoningEffort,
	type OperatorStoreState,
} from '../../shared/agents/service';
import { getDefaultAgentModels, isAllowedAgentModel } from '../../shared/agents/models';
import { isHeartbeatSystemPromptEnabled } from '../heartbeat/config';
import { HeartbeatFileStore } from '../heartbeat/store';
import type { HeartbeatEventPayload } from '../../shared/heartbeat';
import type { ChannelType } from '../../shared/channels';
import type { PublicProvider } from '../../shared/providers';
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
	userDataDirectory: UserDataDirectoryServicePort;
	connectors?: ConnectorsService;
	skills?: SkillsService;
	mcpRegistry?: McpRegistry;
	taskManager?: TasksService;
	subagents?: SubagentSpawnPort;
	policy?: PolicyServicePort;
	toolService?: ToolServicePort;
	channels?: Pick<ChannelsService, 'getChannel' | 'getChannelConfig'>;
	channelRegistry?: ChannelRegistry;
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
	capabilityService?: AgentCapabilityServicePort;
	executionService?: AgentExecutionServicePort;
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
	lightContext?: boolean;
	streamEvent?: (event: AgentResponseEvent) => void;
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

function startupContextChars(files: WorkspaceContextFile[]): number {
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
	private readonly capabilityService: AgentCapabilityServicePort;
	private readonly executionService: AgentExecutionServicePort;
	private readonly usesDefaultToolsFactory: boolean;
	private readonly runLoggerFactory: (agentId: string) => AgentRunLogger;
	private readonly sessionBaseDir?: string;
	private readonly beforeAgentRunHooks: BeforeAgentRunHook[];
	private heartbeatStore: HeartbeatFileStore | null = null;
	private readonly runtimes = new Map<string, Runtime>();
	private readonly runRecords = new Map<string, AgentRunRecord>();
	private readonly startupWorkspaces = new Map<string, WorkspaceService>();

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
		this.capabilityService =
			options.capabilityService ??
			new AgentCapabilityService({
				connectors: dependencies.connectors,
				skills: dependencies.skills,
				logger: dependencies.logger,
			});
		this.executionService =
			options.executionService ?? new AgentExecutionService(this.toolService);
		this.usesDefaultToolsFactory = !options.toolsFactory;
		this.toolsFactory = options.toolsFactory ?? ((context) => this.createDefaultTools(context));
		this.runLoggerFactory = options.runLoggerFactory ?? ((id) => new AgentRunLogger(id));
		this.sessionBaseDir = options.sessionBaseDir;
		this.beforeAgentRunHooks = options.beforeAgentRunHooks ?? [];
		this.ensureRuntime(this.defaultAgentId);
	}

	getHeartbeatStore(): HeartbeatFileStore {
		if (!this.heartbeatStore) {
			this.heartbeatStore = new HeartbeatFileStore({ logger: this.dependencies.logger });
		}
		return this.heartbeatStore;
	}

	getHeartbeatOperatorConfig(): OperatorStoreState | undefined {
		return this.getOperatorConfig();
	}

	getHeartbeatProvider(providerId: string): PublicProvider | undefined {
		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) return undefined;
		const { apiKey: _apiKey, ...publicProvider } = provider;
		return publicProvider;
	}

	getHeartbeatModel(providerId: string, modelId: string): Model | undefined {
		const normalizedProviderId = providerId.trim().toLowerCase();
		const normalizedModelId = modelId.trim();
		if (!normalizedModelId || !isAllowedAgentModel(normalizedProviderId, normalizedModelId)) {
			return undefined;
		}
		const catalogModel = getDefaultAgentModels(normalizedProviderId).find(
			(model) => model.id === normalizedModelId
		);
		return {
			id: catalogModel?.id ?? normalizedModelId,
			name: catalogModel?.name ?? normalizedModelId,
		};
	}

	onHeartbeatRoute(listener: (payload: unknown) => void): () => void {
		return this.dependencies.eventBus.on('channel:route', (event) => listener(event.payload));
	}

	broadcastHeartbeatSystemEvent(payload: unknown): void {
		this.dependencies.eventBus.broadcast('heartbeat:system-event', payload);
	}

	emitHeartbeatEvent(payload: HeartbeatEventPayload): void {
		this.dependencies.eventBus.emit('heartbeat:event', payload);
		this.dependencies.eventBus.broadcast('heartbeat:event', payload);
	}

	warnHeartbeat(message: string, data?: unknown): void {
		this.dependencies.logger.warn('HeartbeatService', message, data);
	}

	errorHeartbeat(message: string, error?: unknown): void {
		this.dependencies.logger.error('HeartbeatService', message, error);
	}

	readHeartbeatWorkspaceFile(name: string): ReturnType<WorkspaceService['readWorkspaceFile']> {
		return this.dependencies.workspace.readWorkspaceFile(name);
	}

	getHeartbeatChannel(): ReturnType<ChannelsService['getChannel']> | undefined {
		return this.dependencies.channels?.getChannel();
	}

	getHeartbeatChannelConfig(channelId: ChannelType): ReturnType<ChannelsService['getChannelConfig']> | undefined {
		return this.dependencies.channels?.getChannelConfig(channelId);
	}

	getHeartbeatChannelRegistry(): ChannelRegistry | undefined {
		return this.dependencies.channelRegistry;
	}

	async createRun(options: AgentCreateRunOptions = {}): Promise<AgentRunRecord> {
		const now = new Date().toISOString();
		const agentId = options.agentId ?? this.defaultAgentId;
		const sessionId = options.sessionId ?? options.runId ?? randomUUID();
		const runId = options.runId ?? sessionId;
		const providerModel = this.tryResolveProviderAndModel();
		const providerId = options.providerId?.trim().toLowerCase() || providerModel.providerId;
		const model = options.model?.trim() || providerModel.model;
		const run = this.upsertRunRecord({
			id: runId,
			agentId,
			sessionId,
			state: options.state ?? 'idle',
			createdAt: now,
			updatedAt: now,
			providerId,
			model,
		});
		const session = await loadSession(sessionId, model, providerId, {
			baseDir: this.sessionBaseDir,
		});
		this.applyAgentSessionMetadata(session, agentId, options.sessionMetadata);
		session.status = this.sessionStatusForRunState(run.state);
		await saveSession(session, { baseDir: this.sessionBaseDir });
		return run;
	}

	async getRun(runId: string): Promise<AgentRunRecord | undefined> {
		const existing = this.runRecords.get(runId);
		if (existing) return this.cloneRunRecord(existing);
		const session = await loadExistingSession(runId, { baseDir: this.sessionBaseDir });
		return session ? this.sessionToRunRecord(session) : undefined;
	}

	async getRunState(runId: string): Promise<AgentRunState | undefined> {
		return (await this.getRun(runId))?.state;
	}

	async updateRunState(runId: string, patch: AgentRunStatePatch): Promise<AgentRunRecord> {
		const run = await this.requireRun(runId);
		const next = this.upsertRunRecord({
			...run,
			...patch,
			updatedAt: new Date().toISOString(),
		});
		const session = await loadExistingSession(next.sessionId, { baseDir: this.sessionBaseDir });
		if (session) {
			session.status = this.sessionStatusForRunState(next.state);
			await saveSession(session, { baseDir: this.sessionBaseDir });
		}
		return next;
	}

	async deleteRun(runId: string): Promise<void> {
		const run = await this.getRun(runId);
		const sessionId = run?.sessionId ?? runId;
		this.cancel(sessionId);
		this.runtimes.delete(sessionId);
		this.runRecords.delete(runId);
		await clearSession(sessionId, { baseDir: this.sessionBaseDir });
		if (sessionId !== runId) {
			await clearSession(runId, { baseDir: this.sessionBaseDir });
		}
	}

	async listRuns(): Promise<AgentRunRecord[]> {
		const runs = new Map<string, AgentRunRecord>();
		for (const session of await listSessions({ baseDir: this.sessionBaseDir })) {
			const run = this.sessionToRunRecord(session);
			runs.set(run.id, run);
		}
		for (const run of this.runRecords.values()) {
			runs.set(run.id, this.cloneRunRecord(run));
		}
		return [...runs.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	async executeRun(
		runId: string,
		message: string,
		options: AgentExecuteRunOptions = {}
	): Promise<string> {
		const run = await this.requireRun(runId);
		await this.updateRunState(runId, { state: 'thinking' });
		try {
			const text = await this.send(message, run.agentId, {
				...options,
				runId,
				sessionId: run.sessionId,
			});
			await this.updateRunState(runId, { state: 'completed', output: text, error: undefined });
			if (options.deleteWhenDone) await this.deleteRun(runId);
			return text;
		} catch (error) {
			await this.updateRunState(runId, {
				state: 'error',
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
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
		const runId = options.runId ?? randomUUID();
		const agentConfig = this.getConfiguredAgent(agentId);
		this.upsertRunRecord({
			id: runId,
			agentId,
			sessionId: runtimeAgentId,
			state: 'idle',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			providerId: options.providerId,
			model: options.model,
		});
		const streamEvent = (event: AgentRunStreamEvent): void => {
			if (event.type === 'run_state') {
				this.updateRunRecordSync(runId, {
					state: event.state,
					label: event.label,
				});
			}
			const responseEvent = {
				agentId: runtimeAgentId,
				runId,
				...event,
			} as AgentResponseEvent;
			if (heartbeatOptions?.suppressAgentEvents) return;
			options.streamEvent?.(responseEvent);
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
			this.updateRunRecordSync(runId, { providerId, model });
			streamEvent({ type: 'model_selected', providerId, model, effort });
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
			let startupFiles: WorkspaceContextFile[] = [];
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

			let directAnswer =
				!heartbeatOptions &&
				!bootstrapPending &&
				!toolPolicy.shouldUseTools;
			let capabilityPromptAdditions = '';

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
			const capabilities = await recordAsyncPhase(phaseDurationsMs, 'resolve_capabilities', () =>
				this.capabilityService.resolveForPrompt({
					userMessage: message,
					localTools: selectedTools,
					ctx,
					providerId,
					model,
					shouldUseTools: toolPolicy.shouldUseTools,
					bootstrapPending,
					directAnswer,
					configuredSkillNames: agentConfig?.skills,
					streamEvent,
				})
			);
			selectedTools = capabilities.tools;
			capabilityPromptAdditions = capabilities.promptAdditions;
			directAnswer = capabilities.directAnswer;
			const bootstrapMode = resolveBootstrapMode({
				bootstrapPending,
				isInteractiveUserFacing: true,
				isPrimaryRun,
				isCanonicalWorkspace: workspaceRoot === this.workspaceRoot(),
				hasBootstrapFileAccess: false,
				runKind,
			});
			startupFiles = this.filterStartupFilesForBootstrapMode(startupFiles, bootstrapMode);
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
			const systemPromptWithCapabilities = capabilityPromptAdditions
				? `${systemPrompt}\n\n${capabilityPromptAdditions}`
				: systemPrompt;
			const systemPromptForTurn = toolSelection.systemPromptSuffix
				? `${systemPromptWithCapabilities}\n\n${toolSelection.systemPromptSuffix}`
				: systemPromptWithCapabilities;

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
				this.updateRunRecordSync(runId, {
					state: 'completed',
					output: beforeRun.message,
				});
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
			const result = await this.executionService.execute({
				runId,
				userMessage: message,
				systemPrompt: systemPromptForTurn,
				session: activeSession,
				provider,
				providerId,
				model,
				effort,
				tools: selectedTools,
				ctx,
				streamEvent,
				maxTokens: AGENT_TOOL_LIMITS.maxTokens,
				maxIterations: AGENT_TOOL_LIMITS.maxIterations,
				hooks,
				signal: abort.signal,
				toolManagement: { enabled: false },
				toolService: this.toolService,
			});

			runtime.session = {
				...result.session,
				status: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
			};
			await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
			runtime.currentAbort = null;
			clearRunTimeout();
			this.updateRunRecordSync(runId, {
				state: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
				output: result.finalText,
			});
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
			this.updateRunRecordSync(runId, {
				state: abort.signal.aborted ? 'cancelled' : 'error',
				error: abort.signal.aborted ? undefined : (err as Error).message,
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

	private async requireRun(runId: string): Promise<AgentRunRecord> {
		const run = await this.getRun(runId);
		if (!run) throw new Error(`Agent run not found: ${runId}`);
		return run;
	}

	private upsertRunRecord(record: AgentRunRecord): AgentRunRecord {
		const existing = this.runRecords.get(record.id);
		const next = {
			...existing,
			...record,
			createdAt: existing?.createdAt ?? record.createdAt,
			updatedAt: record.updatedAt,
		};
		this.runRecords.set(record.id, next);
		return this.cloneRunRecord(next);
	}

	private updateRunRecordSync(runId: string, patch: AgentRunStatePatch): AgentRunRecord | undefined {
		const existing = this.runRecords.get(runId);
		if (!existing) return undefined;
		return this.upsertRunRecord({
			...existing,
			...patch,
			updatedAt: new Date().toISOString(),
		});
	}

	private cloneRunRecord(record: AgentRunRecord): AgentRunRecord {
		return { ...record };
	}

	private sessionToRunRecord(session: SessionFile): AgentRunRecord {
		return {
			id: session.id,
			agentId: session.agentId ?? session.agentMetadata?.agentId ?? this.defaultAgentId,
			sessionId: session.id,
			state: this.runStateForSessionStatus(session.status),
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			providerId: session.provider,
			model: session.model,
		};
	}

	private runStateForSessionStatus(status: SessionStatus | undefined): AgentRunState {
		if (status === 'completed') return 'completed';
		if (status === 'cancelled') return 'cancelled';
		if (status === 'failed') return 'error';
		if (status === 'idle') return 'idle';
		if (status === 'waiting') return 'thinking';
		return 'idle';
	}

	private sessionStatusForRunState(state: AgentRunState): SessionStatus {
		if (state === 'completed') return 'completed';
		if (state === 'cancelled') return 'cancelled';
		if (state === 'error') return 'failed';
		if (state === 'idle') return 'idle';
		return 'active';
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
			return await this.getStartupWorkspace(agentId).isBootstrapPending();
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Bootstrap status unavailable', {
				error: (error as Error).message,
			});
			return false;
		}
	}

	private async loadStartupFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		try {
			return await this.getStartupWorkspace(agentId).loadContextFiles();
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Startup context unavailable', {
				error: (error as Error).message,
			});
		}
		return [];
	}

	private getStartupWorkspace(agentId: string): WorkspaceService {
		const resolvedAgentId = agentId.trim();
		if (!resolvedAgentId) throw new Error('Agent id is required.');
		let workspace = this.startupWorkspaces.get(resolvedAgentId);
		if (workspace) return workspace;
		workspace = new WorkspaceService(this.dependencies.logger, {
			rootPath: this.dependencies.userDataDirectory.resolve(
				'agent',
				'workspaces',
				encodeURIComponent(resolvedAgentId)
			),
		});
		this.startupWorkspaces.set(resolvedAgentId, workspace);
		return workspace;
	}

	private filterStartupFilesForRun(
		files: WorkspaceContextFile[],
		params: {
			runKind: 'default' | 'heartbeat' | 'cron';
			lightContext: boolean;
			includeHeartbeatContext: boolean;
			isPrimaryRun: boolean;
		}
	): WorkspaceContextFile[] {
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
		files: WorkspaceContextFile[],
		bootstrapMode: 'none' | 'limited' | 'full'
	): WorkspaceContextFile[] {
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
