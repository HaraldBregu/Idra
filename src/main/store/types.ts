import type { Provider } from "../../shared/providers";
import type { ModelReasoningEffort } from "../../shared/service";
import type { HeartbeatStoreState } from "../../shared/heartbeat";
import { Channel } from "../../shared/channels";
import { ConnectorConfig } from "../../shared/connectors";
import type { AppPermissionSettings } from "../../shared/app-permissions";
import type { AppSettings } from "../../shared/app-settings";

export type ModelProviderSettings = Pick<Provider, 'id' | 'name' | 'baseUrl' | 'apiKey'>;

export interface ModelModuleSettings {
	providerId: string;
	modelId: string;
	effort?: ModelReasoningEffort;
	options?: Record<string, unknown>;
}

export type OcrModuleSettings =
	| {
			mode: 'endpoint';
			endpoint: string;
	  }
	| ({
			mode: 'model';
	  } & ModelModuleSettings);

export interface EmbeddingModuleSettings extends ModelModuleSettings {
	index?: {
		backend: 'local' | 'external';
		namespace?: string;
	};
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

export interface SettingsStore {
	appSettings?: AppSettings;
	appPermissions?: AppPermissionSettings;
	modelProviders: ModelProviderSettings[];
	agent?: ModelModuleSettings;
	speechToText?: ModelModuleSettings;
	textToSpeech?: ModelModuleSettings;
	imageCreator?: ModelModuleSettings;
	textToVideo?: ModelModuleSettings;
	sound?: ModelModuleSettings;
	ocr?: OcrModuleSettings;
	embedding?: EmbeddingModuleSettings;
	taskScheduler?: TaskSchedulerSettings;
	backgroundTask?: BackgroundTaskSettings;
	heartbeat?: HeartbeatStoreState;
	connectors?: ConnectorConfig[];
	channel?: Channel;
}

export type StoreSchema = SettingsStore;

export type SettingsStoreAccessor = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
