import type { Provider } from '../../shared/providers';
import type { ModelReasoningEffort } from '../../shared/agents/service';
import type { HeartbeatStoreState } from '../../shared/heartbeat';
import type { Channel } from '../../shared/channels';
import type { ConnectorConfig } from '../../shared/connector';

export type ModelProviderSettings = Pick<Provider, 'id' | 'name' | 'baseUrl' | 'apiKey'>;

export interface ModelModuleSettings {
	providerId: string;
	modelId: string;
	effort?: ModelReasoningEffort;
	options?: Record<string, unknown>;
}

export interface AgentModuleOptions {
	agentRuntime?: string;
	[key: string]: unknown;
}

export interface TaskSchedulerSettings {
	enabled?: boolean;
	managed?: unknown;
	friday?: unknown;
	legacyTasks?: unknown[];
}

export interface BackgroundTaskSettings {
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

export interface AgentRoutingSettings {
	agents: AgentConfig[];
	bindings: AgentRouteBinding[];
}

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

export interface Connectors {
	google_gmail?: ConnectorConfig;
	google_calendar?: ConnectorConfig;
	google_drive?: ConnectorConfig;
	microsoft_teams?: ConnectorConfig;
	outlook_calendar?: ConnectorConfig;
	outlook_email?: ConnectorConfig;
	sharepoint?: ConnectorConfig;
	dropbox?: ConnectorConfig;
}

export type Channels = Partial<Channel>;

export interface SettingsStore {
	modelProviders: ModelProviderSettings[];
	llmAgent?: ModelModuleSettings;
	speechToText?: ModelModuleSettings;
	textToSpeech?: ModelModuleSettings;
	imageCreator?: ModelModuleSettings;
	textToVideo?: ModelModuleSettings;
	textToSound?: ModelModuleSettings;
	taskScheduler?: TaskSchedulerSettings;
	backgroundTask?: BackgroundTaskSettings;
	agents?: AgentRoutingSettings;
	heartbeat?: HeartbeatStoreState;
	connectors?: Connectors;
	channels?: Channels;
}

export type StoreSchema = SettingsStore;

export type SettingsStoreAccessor = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
