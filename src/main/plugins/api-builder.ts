import path from 'node:path';
import type { ConnectorManifestRecord } from './discovery';
import { registerAgentHarness as registerGlobalAgentHarness } from '../agent/harness/registry';
import {
	FridayConnectorRegistry,
	type ConnectorModelCatalogProviderRegistration,
	type ConnectorProviderRegistration,
	type ConnectorRegistrationMode,
	type ConnectorRegistrySurface,
	type ConnectorToolMetadataRegistration,
	type ConnectorToolRegistration,
} from './registry';
import type { AgentTool } from '../tools/common';
import type { PluginToolFactory } from './tool-types';

export interface ConnectorNextTurnInjection {
	sessionKey?: string;
	[key: string]: unknown;
}

export interface ConnectorNextTurnInjectionResult {
	enqueued: boolean;
	id: string;
	sessionKey?: string;
}

export interface ConnectorSessionTurnUnscheduleResult {
	removed: number;
	failed: number;
}

export interface FridayConnectorApi {
	id: string;
	name: string;
	description: string;
	source: string;
	rootDir?: string;
	registrationMode: ConnectorRegistrationMode;
	pluginConfig?: Record<string, unknown>;
	resolvePath(input: string): string;
	registerTool(registration: AgentTool | PluginToolFactory | ConnectorToolRegistration): void;
	registerToolMetadata(registration: ConnectorToolMetadataRegistration): void;
	registerHook(name: string, handler: unknown): void;
	on(name: string, handler: unknown): void;
	registerHttpRoute(registration: unknown): void;
	registerGatewayMethod(registration: unknown): void;
	registerCli(registration: unknown): void;
	registerCommand(registration: unknown): void;
	registerService(registration: unknown): void;
	registerProvider(registration: ConnectorProviderRegistration): void;
	registerModelCatalogProvider(registration: ConnectorModelCatalogProviderRegistration): void;
	registerWebSearchProvider(registration: unknown): void;
	registerWebFetchProvider(registration: unknown): void;
	registerSpeechProvider(registration: unknown): void;
	registerRealtimeTranscriptionProvider(registration: unknown): void;
	registerRealtimeVoiceProvider(registration: unknown): void;
	registerMediaUnderstandingProvider(registration: unknown): void;
	registerVideoGenerationProvider(registration: unknown): void;
	registerMusicGenerationProvider(registration: unknown): void;
	registerMemoryEmbeddingProvider(registration: unknown): void;
	registerMemoryCapability(registration: unknown): void;
	registerMemoryPromptSupplement(registration: unknown): void;
	registerMemoryCorpusSupplement(registration: unknown): void;
	registerChannel(registration: unknown): void;
	registerMigrationProvider(registration: unknown): void;
	registerAgentHarness(registration: {
		id: string;
		label: string;
		supports: (context: {
			provider: string;
			modelId?: string;
			requestedRuntime: string;
		}) => { supported: boolean; priority?: number; reason?: string };
		runAttempt: (params: {
			runId: string;
			provider: string;
			model: string;
			userMessage: string;
			systemPrompt: string;
			session: import('../agent/run').SessionFile;
			requestedRuntime?: string;
			storedRuntime?: string;
			effort?: import('../../shared/agents/service').ModelReasoningEffort;
			tools: import('../tools/types').AgentTool[];
			ctx: import('../tools/types').ToolContext;
			providerAdapter: import('../provider/types').ProviderAdapter;
			maxTokens?: number;
			maxIterations?: number;
			streamOutput?: (chunk: string) => void;
			streamEvent?: (event: import('../agent/run').AgentRunStreamEvent) => void;
			hooks?: import('../agent/run').AgentRunHooks;
			signal?: AbortSignal;
			toolManagement?: import('../tools/management').AgentToolManagementOptions;
			options?: Record<string, unknown>;
		}) => Promise<import('../agent/run').AgentRunResult>;
	}): void;
	registerAgentToolResultMiddleware(registration: unknown): void;
	registerContextEngine(registration: unknown): void;
	registerCompactionProvider(registration: unknown): void;
	registerConfigMigration(registration: unknown): void;
	registerAutoEnableProbe(registration: unknown): void;
	registerRuntimeLifecycle(registration: unknown): void;
	registerCleanup(cleanup: unknown): void;
	enqueueNextTurnInjection(injection: ConnectorNextTurnInjection): Promise<ConnectorNextTurnInjectionResult>;
	registerSessionSchedulerJob(registration: unknown): unknown;
	registerSessionAction(registration: unknown): void;
	sendSessionAttachment(params: unknown): Promise<{ ok: boolean; error?: string }>;
	scheduleSessionTurn(params: unknown): Promise<unknown>;
	unscheduleSessionTurnsByTag(params: unknown): Promise<ConnectorSessionTurnUnscheduleResult>;
	setRunContext(key: string, value: unknown, runId?: string): boolean;
	getRunContext(key: string, runId?: string): unknown;
	clearRunContext(key?: string, runId?: string): void;
}

export interface BuildFridayConnectorApiOptions {
	record: ConnectorManifestRecord;
	registry: FridayConnectorRegistry;
	registrationMode: ConnectorRegistrationMode;
	pluginConfig?: Record<string, unknown>;
}

type SurfacePolicy =
	| 'tool'
	| 'metadata'
	| 'provider'
	| 'channel'
	| 'cli'
	| 'runtime'
	| 'memory'
	| 'session';

export function buildFridayConnectorApi(
	options: BuildFridayConnectorApiOptions
): FridayConnectorApi {
	const { record, registry, registrationMode } = options;
	const attribution = {
		pluginId: record.id,
		source: record.source ?? record.manifestPath,
		rootDir: record.rootDir,
		mode: registrationMode,
	};
	const registerValue = (surface: ConnectorRegistrySurface, value: unknown, key?: string): void => {
		registry.registerValue(surface, value, attribution, key);
	};
	const allowed = (policy: SurfacePolicy): boolean => modeAllows(registrationMode, policy);
	const noop = (): void => undefined;

	return {
		id: record.id,
		name: record.manifest.name,
		description: record.manifest.description,
		source: attribution.source,
		rootDir: record.rootDir,
		registrationMode,
		pluginConfig: options.pluginConfig,
		resolvePath(input) {
			return path.resolve(record.rootDir, input);
		},
		registerTool: allowed('tool')
			? (registration) => registry.registerTool(registration, record.manifest, attribution)
			: noop,
		registerToolMetadata: allowed('metadata')
			? (registration) => registry.registerToolMetadata(registration, record.manifest, attribution)
			: noop,
		registerHook: allowed('runtime') ? (name, handler) => registerValue('hooks', { name, handler }, name) : noop,
		on: allowed('runtime') ? (name, handler) => registerValue('hooks', { name, handler }, name) : noop,
		registerHttpRoute: allowed('runtime') ? (registration) => registerValue('httpRoutes', registration) : noop,
		registerGatewayMethod: allowed('runtime') ? (registration) => registerValue('gatewayMethods', registration) : noop,
		registerCli: allowed('cli') ? (registration) => registerValue('cli', registration) : noop,
		registerCommand: allowed('cli') ? (registration) => registerValue('commands', registration) : noop,
		registerService: allowed('runtime') ? (registration) => registerValue('services', registration) : noop,
		registerProvider: allowed('provider')
			? (registration) => registry.registerProvider(registration, attribution)
			: noop,
		registerModelCatalogProvider: allowed('provider')
			? (registration) => registry.registerModelCatalogProvider(registration, attribution)
			: noop,
		registerWebSearchProvider: allowed('provider')
			? (registration) => registerValue('webSearchProviders', registration)
			: noop,
		registerWebFetchProvider: allowed('provider')
			? (registration) => registerValue('webFetchProviders', registration)
			: noop,
		registerSpeechProvider: allowed('provider')
			? (registration) => registerValue('speechProviders', registration)
			: noop,
		registerRealtimeTranscriptionProvider: allowed('provider')
			? (registration) => registerValue('realtimeTranscriptionProviders', registration)
			: noop,
		registerRealtimeVoiceProvider: allowed('provider')
			? (registration) => registerValue('realtimeVoiceProviders', registration)
			: noop,
		registerMediaUnderstandingProvider: allowed('provider')
			? (registration) => registerValue('mediaUnderstandingProviders', registration)
			: noop,
		registerVideoGenerationProvider: allowed('provider')
			? (registration) => registerValue('videoGenerationProviders', registration)
			: noop,
		registerMusicGenerationProvider: allowed('provider')
			? (registration) => registerValue('musicGenerationProviders', registration)
			: noop,
		registerMemoryEmbeddingProvider: allowed('provider')
			? (registration) => registerValue('memoryEmbeddingProviders', registration)
			: noop,
		registerMemoryCapability: allowed('memory')
			? (registration) => registerValue('memoryCapabilities', registration)
			: noop,
		registerMemoryPromptSupplement: allowed('memory')
			? (registration) => registerValue('memoryPromptSupplements', registration)
			: noop,
		registerMemoryCorpusSupplement: allowed('memory')
			? (registration) => registerValue('memoryCorpusSupplements', registration)
			: noop,
		registerChannel: allowed('channel') ? (registration) => registerValue('channels', registration) : noop,
		registerMigrationProvider: allowed('runtime')
			? (registration) => registerValue('migrationProviders', registration)
			: noop,
		registerAgentHarness: allowed('runtime')
			? (registration) => {
					registerValue('agentHarnesses', registration);
					registerGlobalAgentHarness(registration, { ownerPluginId: record.id });
				}
			: noop,
		registerAgentToolResultMiddleware: allowed('runtime')
			? (registration) => registerValue('agentToolResultMiddleware', registration)
			: noop,
		registerContextEngine: allowed('runtime') ? (registration) => registerValue('contextEngines', registration) : noop,
		registerCompactionProvider: allowed('runtime')
			? (registration) => registerValue('compactionProviders', registration)
			: noop,
		registerConfigMigration: allowed('runtime') ? (registration) => registerValue('configMigrations', registration) : noop,
		registerAutoEnableProbe: allowed('runtime') ? (registration) => registerValue('autoEnableProbes', registration) : noop,
		registerRuntimeLifecycle: allowed('runtime')
			? (registration) => registerValue('runtimeLifecycle', registration)
			: noop,
		registerCleanup: allowed('runtime') ? (cleanup) => registerValue('cleanup', cleanup) : noop,
		async enqueueNextTurnInjection(injection) {
			if (!allowed('session')) return { enqueued: false, id: '', sessionKey: injection.sessionKey };
			registerValue('sessionWorkflows', { type: 'nextTurnInjection', injection });
			return { enqueued: true, id: `${record.id}:${Date.now()}`, sessionKey: injection.sessionKey };
		},
		registerSessionSchedulerJob: allowed('session')
			? (registration) => {
					registerValue('sessionWorkflows', { type: 'schedulerJob', registration });
					return undefined;
				}
			: () => undefined,
		registerSessionAction: allowed('session')
			? (registration) => registerValue('sessionWorkflows', { type: 'sessionAction', registration })
			: noop,
		async sendSessionAttachment(params) {
			if (!allowed('session')) return { ok: false, error: 'session workflow APIs unavailable in this mode' };
			registerValue('sessionWorkflows', { type: 'attachment', params });
			return { ok: true };
		},
		async scheduleSessionTurn(params) {
			if (!allowed('session')) return undefined;
			registerValue('sessionWorkflows', { type: 'scheduleTurn', params });
			return undefined;
		},
		async unscheduleSessionTurnsByTag(params) {
			if (allowed('session')) registerValue('sessionWorkflows', { type: 'unscheduleTurn', params });
			return { removed: 0, failed: 0 };
		},
		setRunContext(key, value, runId) {
			return registry.setRunContext({ pluginId: record.id, runId, key, value });
		},
		getRunContext(key, runId) {
			return registry.getRunContext({ pluginId: record.id, runId, key });
		},
		clearRunContext(key, runId) {
			registry.clearRunContext({ pluginId: record.id, runId, key });
		},
	};
}

function modeAllows(mode: ConnectorRegistrationMode, policy: SurfacePolicy): boolean {
	if (mode === 'full') return true;
	if (policy === 'session') return mode === 'setup-runtime';
	if (mode === 'setup-runtime') return ['provider', 'channel', 'metadata', 'runtime'].includes(policy);
	if (mode === 'tool-discovery') return policy === 'tool' || policy === 'metadata';
	if (mode === 'cli-metadata') return policy === 'cli';
	if (mode === 'discovery') return ['metadata', 'provider', 'channel', 'cli', 'memory'].includes(policy);
	return false;
}
