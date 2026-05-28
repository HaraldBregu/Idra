import { randomUUID } from 'node:crypto';
import type { EventBus } from '../../core/event-bus';
import type { CronService } from '../../cron';
import type { LoggerService } from '../../logger';
import type { StoreService } from '../../store';
import type { TasksService } from '../../tasks';
import type { UserDataDirectoryServicePort } from '../../user-data';
import type { ConnectorsService } from '../../connectors';
import type { SkillsService } from '../../skills';
import type { ChannelRegistry, ChannelsService } from '../../channels';
import type { AgentResponseEvent } from '../../../shared/agents/events';
import type { Model, ModelReasoningEffort, OperatorStoreState, AgentRunState } from '../../../shared/agents/service';
import { getDefaultAgentModels, isAllowedAgentModel } from '../../../shared/agents/models';
import type { AgentSessionMetadata } from '../../../shared/store';
import type { PublicProvider } from '../../../shared/providers';
import { requireModelReasoningEffort } from '../../../shared/agents/service';
import { makeProvider, type ProviderSpec } from '../../provider/factory';
import type { ProviderAdapter, TranscriptEntry } from '../../provider/types';
import { HeartbeatFileStore } from '../../heartbeat/store';
import type { HeartbeatEventPayload } from '../../../shared/heartbeat';
import type { ChannelType } from '../../../shared/channels';
import { DEFAULT_AGENT_ID } from '../constants';
import { AgentStartupFilesService, type AgentStartupFilesServicePort } from '../context/startup';
import { buildSystemPrompt } from '../context/prompt';
import { AgentExecutionService, type AgentExecutionServicePort } from '../execution/service';
import { loadExistingSession, loadSession, saveSession, clearSession, listSessions, type SessionFile, type SessionStatus } from '../context/session/store';
import type { AgentDataDirectoryServicePort } from '../storage';
import type { AgentSettingsStorePort } from '../settings';
import type { AgentMcpClientServicePort, McpRegistry } from '../capabilities/mcp';
import type { SubagentSpawnPort } from '../execution/subagents';
import { ToolService, type AgentTool, type CronToolContext, type ToolContext, type ToolServicePort } from '../capabilities/local';
import type { AgentCapabilityServicePort } from '../capabilities';
import { resolveAgentCapabilities } from '../capabilities';
import { evaluateBeforeAgentRunHooks, type BeforeAgentRunHook } from './before-run';

export interface AgentServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	userDataDirectory: UserDataDirectoryServicePort;
	agentDataDirectory?: AgentDataDirectoryServicePort;
	agentSettings?: AgentSettingsStorePort;
	connectors?: ConnectorsService;
	mcpClient?: AgentMcpClientServicePort;
	skills?: SkillsService;
	mcpRegistry?: McpRegistry;
	taskManager?: TasksService;
	subagents?: SubagentSpawnPort;
	toolService?: ToolServicePort;
	channels?: Pick<ChannelsService, 'getChannel' | 'getChannelConfig'>;
	channelRegistry?: ChannelRegistry;
	startupFiles?: AgentStartupFilesServicePort;
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
	toolsAllow?: string[];
	toolsDeny?: string[];
}
export type AgentToolsFactory = (context: AgentToolsFactoryContext) => AgentTool[] | Promise<AgentTool[]>;

export interface AgentServiceOptions {
	defaultAgentId?: string;
	providerFactory?: (provider: ProviderSpec) => ProviderAdapter;
	toolsFactory?: AgentToolsFactory;
	toolService?: ToolServicePort;
	capabilityService?: AgentCapabilityServicePort;
	executionService?: AgentExecutionServicePort;
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
	heartbeat?: { model?: string; timeoutSeconds?: number; lightContext?: boolean; suppressToolErrorWarnings?: boolean; suppressAgentEvents?: boolean };
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
export type AgentRunStatePatch = Partial<Pick<AgentRunRecord, 'state' | 'label' | 'output' | 'error' | 'providerId' | 'model'>>;
export type AgentExecuteRunOptions = Omit<AgentSendOptions, 'runId' | 'sessionId'> & { deleteWhenDone?: boolean };

export class AgentService {
	private readonly defaultAgentId: string;
	private readonly providerFactory: (provider: ProviderSpec) => ProviderAdapter;
	private readonly toolService: ToolServicePort;
	private readonly executionService: AgentExecutionServicePort;
	private readonly toolsFactory: AgentToolsFactory;
	private readonly sessionBaseDir?: string;
	private readonly beforeAgentRunHooks: BeforeAgentRunHook[];
	private readonly aborts = new Map<string, AbortController>();
	private readonly runRecords = new Map<string, AgentRunRecord>();
	private heartbeatStore: HeartbeatFileStore | null = null;
	private startupFiles: AgentStartupFilesServicePort | null = null;

	constructor(private readonly dependencies: AgentServiceDependencies, options: AgentServiceOptions = {}) {
		this.defaultAgentId = options.defaultAgentId ?? DEFAULT_AGENT_ID;
		this.providerFactory = options.providerFactory ?? makeProvider;
		this.toolService = options.toolService ?? dependencies.toolService ?? new ToolService({ cron: dependencies.cron, logger: dependencies.logger });
		this.executionService = options.executionService ?? new AgentExecutionService(this.toolService);
		this.toolsFactory = options.toolsFactory ?? ((ctx) => this.toolService.createDefaultTools({ toolPolicy: { allow: ctx.toolsAllow }, denylist: ctx.toolsDeny }));
		this.sessionBaseDir = options.sessionBaseDir;
		this.beforeAgentRunHooks = options.beforeAgentRunHooks ?? [];
	}

	getHeartbeatStore(): HeartbeatFileStore {
		return this.heartbeatStore ??= new HeartbeatFileStore({ logger: this.dependencies.logger });
	}
	getHeartbeatOperatorConfig(): OperatorStoreState | undefined { return this.dependencies.store.getService?.() as OperatorStoreState | undefined; }
	getHeartbeatProvider(providerId: string): PublicProvider | undefined {
		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) return undefined;
		const { apiKey: _apiKey, ...publicProvider } = provider;
		return publicProvider;
	}
	getHeartbeatModel(providerId: string, modelId: string): Model | undefined {
		if (!isAllowedAgentModel(providerId, modelId)) return undefined;
		const model = getDefaultAgentModels(providerId).find((entry) => entry.id === modelId);
		return { id: modelId, name: model?.name ?? modelId };
	}
	onHeartbeatRoute(listener: (payload: unknown) => void): () => void { return this.dependencies.eventBus.on('channel:route', (event) => listener(event.payload)); }
	broadcastHeartbeatSystemEvent(payload: unknown): void { this.dependencies.eventBus.broadcast('heartbeat:system-event', payload); }
	emitHeartbeatEvent(payload: HeartbeatEventPayload): void { this.dependencies.eventBus.emit('heartbeat:event', payload); this.dependencies.eventBus.broadcast('heartbeat:event', payload); }
	warnHeartbeat(message: string, data?: unknown): void { this.dependencies.logger.warn('HeartbeatService', message, data); }
	errorHeartbeat(message: string, error?: unknown): void { this.dependencies.logger.error('HeartbeatService', message, error); }
	readHeartbeatWorkspaceFile(name: string) { return this.getStartupFilesService().readFile(this.defaultAgentId, name); }
	getHeartbeatChannel(): ReturnType<ChannelsService['getChannel']> | undefined { return this.dependencies.channels?.getChannel(); }
	getHeartbeatChannelConfig(channelId: ChannelType): ReturnType<ChannelsService['getChannelConfig']> | undefined { return this.dependencies.channels?.getChannelConfig(channelId); }
	getHeartbeatChannelRegistry(): ChannelRegistry | undefined { return this.dependencies.channelRegistry; }
	emitHeartbeatEventPayload(payload: HeartbeatEventPayload): void { this.emitHeartbeatEvent(payload); }

	async createRun(options: AgentCreateRunOptions = {}): Promise<AgentRunRecord> {
		const now = new Date().toISOString();
		const id = options.runId ?? randomUUID();
		const sessionId = options.sessionId ?? id;
		const run = this.upsertRun({ id, agentId: options.agentId ?? this.defaultAgentId, sessionId, state: options.state ?? 'idle', createdAt: now, updatedAt: now, providerId: options.providerId, model: options.model });
		await loadSession(sessionId, options.model ?? 'unknown', options.providerId, { baseDir: this.sessionBaseDir });
		return run;
	}
	async getRun(runId: string): Promise<AgentRunRecord | undefined> { return this.runRecords.get(runId); }
	async getRunState(runId: string): Promise<AgentRunState | undefined> { return (await this.getRun(runId))?.state; }
	async updateRunState(runId: string, patch: AgentRunStatePatch): Promise<AgentRunRecord> {
		const run = this.requireRun(runId);
		return this.upsertRun({ ...run, ...patch, updatedAt: new Date().toISOString() });
	}
	async deleteRun(runId: string): Promise<void> {
		const run = this.runRecords.get(runId);
		this.cancel(run?.sessionId ?? runId);
		this.runRecords.delete(runId);
		await clearSession(run?.sessionId ?? runId, { baseDir: this.sessionBaseDir });
	}
	async listRuns(): Promise<AgentRunRecord[]> { return [...this.runRecords.values()]; }
	async executeRun(runId: string, message: string, options: AgentExecuteRunOptions = {}): Promise<string> {
		const run = this.requireRun(runId);
		const text = await this.send(message, run.agentId, { ...options, runId, sessionId: run.sessionId });
		await this.updateRunState(runId, { state: 'completed', output: text });
		if (options.deleteWhenDone) await this.deleteRun(runId);
		return text;
	}

	async send(message: string, agentId = this.defaultAgentId, options: AgentSendOptions = {}): Promise<string> {
		const sessionId = options.sessionId ?? agentId;
		this.cancel(sessionId);
		const abort = new AbortController();
		this.aborts.set(sessionId, abort);
		const runId = options.runId ?? randomUUID();
		try {
			const selection = this.resolveProviderAndModel(options);
			const session = await loadSession(sessionId, selection.modelId, selection.providerId, { baseDir: this.sessionBaseDir });
			this.emitAgentEvent({ type: 'run_state', state: 'thinking', label: 'started' }, sessionId, runId, options);
			this.emitAgentEvent({ type: 'model_selected', providerId: selection.providerId, model: selection.modelId, effort: selection.effort }, sessionId, runId, options);
			await evaluateBeforeAgentRunHooks(this.beforeAgentRunHooks, { message, agentId, sessionId });
			const startup = this.getStartupFilesService();
			const startupFiles = options.lightContext ? [] : await startup.loadContextFiles(agentId).catch(() => []);
			const ctx = this.toolContext(agentId, sessionId, session, abort.signal, options);
			const localTools = await this.toolsFactory({ agentId, runId, providerId: selection.providerId, model: selection.modelId, workspace: ctx.workspace, session, signal: abort.signal, services: this.dependencies, toolContext: ctx, toolsAllow: options.toolsAllow, toolsDeny: options.toolsDeny });
			this.emitAgentEvent({ type: 'capability_resolution_start' }, sessionId, runId, options);
			const capabilities = await resolveAgentCapabilities({
				message,
				localTools,
				connectors: this.dependencies.connectors,
				skills: this.dependencies.skills,
				configuredSkillNames: this.dependencies.agentSettings?.getAgentConfig(agentId)?.skills,
				toolsAllow: options.toolsAllow,
				toolsDeny: options.toolsDeny,
			});
			const allowedTools = this.toolService.filterToolsByAllowlist(this.toolService.filterToolsByDenylist(capabilities.tools, options.toolsDeny), options.toolsAllow);
			this.emitAgentEvent({ type: 'capability_resolution_result', ...capabilities.summary }, sessionId, runId, options);
			const result = await this.executionService.run({
				runId,
				providerAdapter: selection.adapter,
				model: selection.modelId,
				effort: selection.effort,
				systemPrompt: buildSystemPrompt({ startupFiles, skills: capabilities.selectedSkills, tools: allowedTools }),
				session,
				tools: allowedTools,
				ctx,
				message,
				signal: abort.signal,
				hooks: { streamEvent: (event) => this.emitAgentEvent(event, event.agentId, event.runId, options) },
			});
			await saveSession({ ...result.session, status: this.sessionStatusForStop(result.stopReason) }, { baseDir: this.sessionBaseDir });
			this.emitAgentEvent({ type: 'run_finished', stopReason: result.stopReason, outputChars: result.finalText.length }, sessionId, runId, options);
			this.emitAgentEvent({ type: 'run_state', state: this.sessionStatusForStop(result.stopReason) === 'cancelled' ? 'cancelled' : 'completed' }, sessionId, runId, options);
			return result.finalText;
		} catch (error) {
			this.emitAgentEvent({ type: 'run_state', state: 'error', label: error instanceof Error ? error.message : String(error) }, sessionId, runId, options);
			throw error;
		} finally {
			this.aborts.delete(sessionId);
		}
	}

	cancel(sessionId?: string): void {
		if (sessionId) this.aborts.get(sessionId)?.abort();
		else this.aborts.forEach((abort) => abort.abort());
		if (sessionId) this.aborts.delete(sessionId);
		else this.aborts.clear();
	}
	isBusy(sessionId = this.defaultAgentId): boolean { return this.aborts.has(sessionId); }
	async reset(agentId = this.defaultAgentId): Promise<void> { this.cancel(agentId); await clearSession(agentId, { baseDir: this.sessionBaseDir }); }
	async getHistory(sessionId = this.defaultAgentId): Promise<TranscriptEntry[]> { return (await loadExistingSession(sessionId, { baseDir: this.sessionBaseDir }))?.transcript ?? []; }
	async listSessions(): Promise<SessionFile[]> { return listSessions({ baseDir: this.sessionBaseDir }); }

	private getStartupFilesService(): AgentStartupFilesServicePort {
		return this.dependencies.startupFiles ?? (this.startupFiles ??= new AgentStartupFilesService());
	}
	private resolveProviderAndModel(options: AgentSendOptions): { providerId: string; modelId: string; effort?: ModelReasoningEffort; adapter: ProviderAdapter } {
		const configured = this.dependencies.store.getAgentService?.();
		const providerId = (options.providerId ?? configured?.provider.id ?? 'openai').trim().toLowerCase();
		const modelId = (options.model ?? configured?.model.id ?? configured?.model.name ?? 'gpt-5.4-mini').trim();
		const effort = options.effort ?? configured?.model.effort;
		const resolvedEffort = effort ? requireModelReasoningEffort(modelId, effort, providerId) : undefined;
		const provider = this.dependencies.store.getProviderById(providerId) ?? { id: providerId, apiKey: '', baseUrl: undefined };
		return { providerId, modelId, effort: resolvedEffort, adapter: this.providerFactory({ id: provider.id, apiKey: provider.apiKey, baseURL: provider.baseUrl }) };
	}
	private toolContext(agentId: string, sessionId: string, session: SessionFile, signal: AbortSignal, options: AgentSendOptions): ToolContext {
		return { workspace: this.dependencies.userDataDirectory.resolve('workspace'), agentId, sessionId, sessionBaseDir: this.sessionBaseDir, cronContext: options.cronContext, readState: new Map(), plan: { entries: session.plan }, signal, services: this.dependencies as never };
	}
	private emitAgentEvent(event: Omit<AgentResponseEvent, 'agentId' | 'runId'> | AgentResponseEvent, agentId: string, runId: string, options: AgentSendOptions): void {
		const payload = { ...event, agentId, runId } as AgentResponseEvent;
		this.dependencies.eventBus.broadcast('agent:response', payload);
		options.streamEvent?.(payload);
	}
	private upsertRun(run: AgentRunRecord): AgentRunRecord { this.runRecords.set(run.id, run); return { ...run }; }
	private requireRun(runId: string): AgentRunRecord { const run = this.runRecords.get(runId); if (!run) throw new Error(`Agent run not found: ${runId}`); return run; }
	private sessionStatusForStop(stopReason: string): SessionStatus { return stopReason === 'cancelled' ? 'cancelled' : 'completed'; }
}
