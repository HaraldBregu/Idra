import type { ModelReasoningEffort } from './agents/service';
import type { CronStoreState, CronTask } from './cron';
import type { Provider } from './providers';

export type ProviderSettings = Pick<Provider, 'id' | 'name' | 'baseUrl' | 'apiKey'>;
export type ProvidersSettings = ProviderSettings[];

export interface ModelModuleSettings {
	providerId: string;
	modelId: string;
	effort?: ModelReasoningEffort;
	options?: Record<string, unknown>;
}

export type AssistantSettings = ModelModuleSettings;
export type SpeechToTextSettings = ModelModuleSettings;
export type TextToSpeechSettings = ModelModuleSettings;
export type ImageCreatorSettings = ModelModuleSettings;
export type TextToVideoSettings = ModelModuleSettings;
export type TextToSoundSettings = ModelModuleSettings;

export interface AgentModuleOptions {
	agentRuntime?: string;
	[key: string]: unknown;
}

export interface CronSettings {
	enabled?: boolean;
	scheduler?: CronStoreState;
	tasks?: CronTask[];
}

export interface TaskSettings {
	allowedTaskTypes?: string[];
	defaultConcurrency?: number;
}

export interface AgentToolPolicy {
	profile?: 'minimal' | 'coding' | 'messaging' | 'full';
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	exec?: Record<string, unknown>;
}

export interface AgentConfig {
	id: string;
	default?: boolean;
	name?: string;
	workspace?: string;
	model?: {
		providerId?: string;
		modelId?: string;
		effort?: ModelReasoningEffort;
	};
	skills?: string[];
	tools?: AgentToolPolicy;
	subagents?: {
		allowAgents?: string[];
		maxSpawnDepth?: number;
		maxChildrenPerAgent?: number;
		requireAgentId?: boolean;
		model?: {
			providerId?: string;
			modelId?: string;
			effort?: ModelReasoningEffort;
		};
		runTimeoutSeconds?: number;
	};
}

export type AgentRoutePeerKind = 'direct' | 'group' | 'channel' | 'thread';

export interface AgentRoutePeer {
	kind: AgentRoutePeerKind;
	id: string;
}

export interface AgentParentRoutePeer {
	kind: Exclude<AgentRoutePeerKind, 'thread'>;
	id: string;
}

export type AgentRouteSessionScope =
	| 'main'
	| 'per-peer'
	| 'per-channel-peer'
	| 'per-account-channel-peer';

export interface AgentRouteBinding {
	agentId: string;
	match: {
		channel?: string;
		accountId?: string;
		peer?: AgentRoutePeer;
		parentPeer?: AgentParentRoutePeer;
		roleIds?: string[];
	};
	session?: {
		scope?: AgentRouteSessionScope;
	};
}

export interface AgentsSettings {
	agents: AgentConfig[];
	bindings: AgentRouteBinding[];
}

export type AgentRoutingSettings = AgentsSettings;

export interface AgentSessionMetadata {
	agentId: string;
	spawnedBy?: string;
	spawnDepth?: number;
	subagentRole?: 'main' | 'orchestrator' | 'leaf';
	subagentControlScope?: 'children' | 'none';
	spawnedWorkspace?: string;
	inheritedToolAllow?: string[];
	inheritedToolDeny?: string[];
}

export interface SettingsStore {
	providers?: ProvidersSettings;
	assistant?: AssistantSettings;
	speechToText?: SpeechToTextSettings;
	textToSpeech?: TextToSpeechSettings;
	imageCreator?: ImageCreatorSettings;
	textToVideo?: TextToVideoSettings;
	textToSound?: TextToSoundSettings;
	cron?: CronSettings;
	task?: TaskSettings;
	agents?: AgentsSettings;
}

export type StoreSchema = SettingsStore;

export type SettingsStoreAccessor = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
