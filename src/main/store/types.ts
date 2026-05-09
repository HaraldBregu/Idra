import type { Channel, Provider, UserProfile } from '../../shared/types';

export interface AssistantConfiguration {
	apikey: string;
	model: string;
}

export interface StoreSchema {
	assistantAi: AssistantAiSettings;
	providers: Provider;
	assistantConfiguration: AssistantConfiguration;
	channel: Channel | null;
	profile: UserProfile | null;
}

export const DEFAULTS: StoreSchema = {
	assistantAi: {
		providers: [],
		selectedProvider: 'openai',
		selectedModel: 'gpt-4o-mini',
	},
	providers: {
		openai: { apikey: '', model: '' },
		anthropic: { apikey: '', model: '' },
	},
	assistantConfiguration: { apikey: '', model: '' },
	channel: null,
	profile: null,
};

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
import type { AssistantAiSettings } from '../../shared/types';
