import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

type AgentStoreSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const AGENT_STORE_NAME = 'agent';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const DEFAULT_AGENT_STORE: AgentStoreSchema = { providerId: undefined, modelId: undefined };

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
