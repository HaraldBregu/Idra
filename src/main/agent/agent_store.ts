import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type SearchEngineSettings = {
	providerId: string;
	providerName: string;
	enabled: boolean;
};
type AgentStoreSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
	search_engine: SearchEngineSettings;
};

const AGENT_STORE_NAME = 'agent';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const DEFAULT_AGENT_STORE: AgentStoreSchema = {
	providerId: undefined,
	modelId: undefined,
	search_engine: { providerId: '', providerName: '', enabled: false },
};

const store = new Store<AgentStoreSchema>({
	name: AGENT_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_STORE,
});

export function getProviderId(): string | undefined {
	return store.get('providerId');
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}

export function getSearchEngine(): SearchEngineSettings {
	return store.get('search_engine');
}

export function setSearchEngine(searchEngine: SearchEngineSettings): void {
	store.set('search_engine', searchEngine);
}
