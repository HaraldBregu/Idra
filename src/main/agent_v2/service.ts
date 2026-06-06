import { randomUUID } from 'node:crypto';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { ConnectorsService } from '../connectors';
import type { CronService } from '../cron';
import { HeartbeatFileStore } from '../heartbeat/store';
import type { HeartbeatEventPayload } from '../../shared/heartbeat';
import type { HeartbeatToolResponse } from '../heartbeat/prompt';
import type { ChannelType } from '../../shared/channels';
import type { AgentSessionMetadata } from '../../shared/store';
import type { EventBus } from '../services/event-bus';
import type { AgentDataDirectoryServicePort } from '../data-directory';
import type { AgentSettingsStorePort } from '../agent-settings';
import type { LoggerService } from '../observability';
import type { LlmService } from '../llm';
import type { SkillsService } from '../skills';
import type { StoreService } from '../store';
import {
	getDefaultAgentModels,
	isAllowedAgentModel,
	type Model,
	type ModelReasoningEffort,
} from '../../shared/agents/service';
import type { AgentResponseEvent } from '../../shared/agents/events';
import type { AgentRunStopReason } from '../../shared/agents/constants';
import type { PublicProvider } from '../../shared/providers';
import { AgentWorkspaceService, type WorkspaceService } from '../workspace';
import type { AgentStartupFilesServicePort } from '../workspace/startup';
import type { RuntimeEvent, RuntimeRun } from './runtime';
import { AgentRuntime } from './runtime';
import { buildSystemPrompt } from './runtime/prompt';

export interface AgentV2ServiceDependencies {
	store: StoreService;
	cron?: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
	agentDataDirectory?: AgentDataDirectoryServicePort;
	agentSettings?: AgentSettingsStorePort;
	llm?: LlmService;
	connectors?: ConnectorsService;
	skills?: SkillsService;
	channels?: Pick<ChannelsService, 'getChannel' | 'getChannelConfig'>;
	channelRegistry?: ChannelRegistry;
	startupFiles?: AgentStartupFilesServicePort;
}

export interface AgentV2ServiceOptions {
	defaultAgentId?: string;
	sessionBaseDir?: string;
}

export interface AgentSendOptions {
	runId?: string;
	sessionId?: string;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	lightContext?: boolean;
	streamEvent?: (event: AgentResponseEvent) => void;
	toolsAllow?: string[];
	toolsDeny?: string[];
	sessionMetadata?: Partial<AgentSessionMetadata>;
	cronContext?: unknown;
	heartbeat?: {
		model?: string;
		timeoutSeconds?: number;
		lightContext?: boolean;
		suppressToolErrorWarnings?: boolean;
		suppressAgentEvents?: boolean;
		enableHeartbeatTool?: boolean;
		forceHeartbeatTool?: boolean;
		onToolResponse?: (response: HeartbeatToolResponse) => void;
	};
}

function normalizeStopReason(value: string | undefined): AgentRunStopReason {
	if (value === 'max_tokens') return 'max_tokens';
	if (value === 'max_iterations' || value === 'error_max_turns') return 'max_iterations';
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

function runtimeEventToAgentEvents(
	event: RuntimeEvent,
	agentId: string,
	runId: string,
	providerId: string
): AgentResponseEvent[] {
	if (event.type === 'run_started') {
		return [{ type: 'run_state', state: 'thinking', agentId, runId }];
	}
	if (event.type === 'model_call_start') {
		return [{ type: 'model_selected', providerId, model: event.model, agentId, runId }];
	}
	if (event.type === 'model_call_delta') {
		return [{ type: 'text_delta', delta: event.delta, agentId, runId }];
	}
	if (event.type === 'tool_call_start') {
		return [
			{
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'tool_call_end') {
		return [
			{
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: event.toolName,
				toolName: event.toolName,
				input: {},
				output: event.output,
				outputText: outputText(event.output),
				status: 'ok',
				durationMs: 0,
				name: event.toolName,
				serviceKind: 'tool',
				agentId,
				runId,
			},
		];
	}
	if (event.type === 'run_finished') {
		return [
			{
				type: 'run_finished',
				stopReason:
					event.result.subtype === 'error_max_turns'
						? 'max_iterations'
						: normalizeStopReason(event.result.stopReason),
				outputChars: event.result.text.length,
				agentId,
				runId,
			},
			{ type: 'run_state', state: 'completed', agentId, runId },
		];
	}
	if (event.type === 'run_stopped') {
		return [{ type: 'run_state', state: 'cancelled', label: event.reason, agentId, runId }];
	}
	return [];
}

export class AgentV2Service {
	private readonly runtime = new AgentRuntime();
	private readonly activeRuns = new Map<string, RuntimeRun>();
	private readonly defaultAgentId: string;
	private workspaceService: AgentWorkspaceService | null = null;
	private heartbeatStore: HeartbeatFileStore | null = null;

	constructor(
		private readonly dependencies: AgentV2ServiceDependencies,
		options: AgentV2ServiceOptions = {}
	) {
		this.defaultAgentId = options.defaultAgentId ?? 'main';
	}

	async send(message: string, agentId?: string, options: AgentSendOptions = {}): Promise<string> {
		const resolvedAgentId = agentId?.trim() || this.defaultAgentId;
		const configured = this.dependencies.store.getAgentService();
		const providerId = options.providerId ?? configured?.provider.id;
		const model = options.model ?? options.heartbeat?.model ?? configured?.model.id;
		if (!providerId || !model) throw new Error('Agent v2 requires a configured provider and model.');

		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Agent v2 provider is not configured: ${providerId}`);

		this.cancel(resolvedAgentId);
		const runId = options.runId ?? randomUUID();
		const sessionId = options.sessionId ?? resolvedAgentId;
		const system = await buildSystemPrompt({
			date: new Date().toISOString().slice(0, 10),
			workspace: this.dependencies.workspace.getRootPath(),
		});
		const run = this.runtime.run({
			task: 'chat',
			message,
			provider: {
				id: provider.id,
				apiKey: provider.apiKey,
				baseURL: provider.baseUrl,
			},
			model,
			sessionId,
			system,
			maxRetries: 1,
		});
		this.activeRuns.set(resolvedAgentId, run);

		let response = '';
		try {
			for await (const event of run.stream) {
				if (event.type === 'model_call_delta') response += event.delta;
				if (event.type === 'run_finished') response = event.result.text || response;
				for (const responseEvent of runtimeEventToAgentEvents(
					event,
					resolvedAgentId,
					runId,
					provider.id
				)) {
					options.streamEvent?.(responseEvent);
					if (!options.heartbeat?.suppressAgentEvents) {
						this.dependencies.eventBus.broadcast('agent:response', responseEvent);
					}
				}
			}
			return response;
		} catch (error) {
			const responseEvent = {
				type: 'run_state',
				state: 'error',
				label: error instanceof Error ? error.message : 'Agent v2 request failed.',
				agentId: resolvedAgentId,
				runId,
			} satisfies AgentResponseEvent;
			options.streamEvent?.(responseEvent);
			this.dependencies.eventBus.broadcast('agent:response', responseEvent);
			throw error;
		} finally {
			if (this.activeRuns.get(resolvedAgentId) === run) this.activeRuns.delete(resolvedAgentId);
		}
	}

	reset(agentId = this.defaultAgentId): void {
		this.cancel(agentId);
	}

	cancel(agentId?: string): void {
		if (agentId) {
			this.activeRuns.get(agentId)?.stop('cancelled');
			this.activeRuns.delete(agentId);
			return;
		}
		for (const run of this.activeRuns.values()) run.stop('cancelled');
		this.activeRuns.clear();
	}

	isBusy(agentId: string): boolean {
		return this.activeRuns.has(agentId);
	}

	getHistory(): [] {
		return [];
	}

	listStartupFiles(agentId: string): ReturnType<AgentStartupFilesServicePort['listFiles']> {
		return this.getWorkspaceService().listFiles(agentId);
	}

	readStartupFile(
		agentId: string,
		name: string
	): ReturnType<AgentStartupFilesServicePort['readFile']> {
		return this.getWorkspaceService().readFile(agentId, name);
	}

	writeStartupFile(
		agentId: string,
		name: string,
		content: string
	): ReturnType<AgentStartupFilesServicePort['writeFile']> {
		return this.getWorkspaceService().writeFile(agentId, name, content);
	}

	readHeartbeatStartupFile(
		agentId: string,
		name: string
	): ReturnType<AgentStartupFilesServicePort['readFile']> {
		return this.readStartupFile(agentId, name);
	}

	getHeartbeatStore(): HeartbeatFileStore {
		this.heartbeatStore ??= new HeartbeatFileStore({ logger: this.dependencies.logger });
		return this.heartbeatStore;
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

	getHeartbeatChannel(): ReturnType<ChannelsService['getChannel']> | undefined {
		return this.dependencies.channels?.getChannel();
	}

	getHeartbeatChannelConfig(
		channelId: ChannelType
	): ReturnType<ChannelsService['getChannelConfig']> | undefined {
		return this.dependencies.channels?.getChannelConfig(channelId);
	}

	getHeartbeatChannelRegistry(): ChannelRegistry | undefined {
		return this.dependencies.channelRegistry;
	}

	private getWorkspaceService(): AgentWorkspaceService {
		this.workspaceService ??= new AgentWorkspaceService({
			agentDataDirectory: this.dependencies.agentDataDirectory,
			logger: this.dependencies.logger,
			startupFiles: this.dependencies.startupFiles,
		});
		return this.workspaceService;
	}
}
