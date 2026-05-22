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
