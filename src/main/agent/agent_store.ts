import path from 'node:path';
import { existsSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

type AgentStoreSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const AGENT_STORE_NAME = 'agent';
const agentDirectory = path.resolve(userDataLocation(), 'agent');
const hasAgentStore = existsSync(path.join(agentDirectory, 'agent.json'));
const DEFAULT_AGENT_STORE: AgentStoreSchema = { providerId: undefined, modelId: undefined };

const store = new Store<AgentStoreSchema>({
	name: AGENT_STORE_NAME,
	cwd: agentDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_STORE,
});

if (!hasAgentStore && existsSync(path.join(agentDirectory, 'settings.json'))) {
	const legacyStore = new Store<AgentStoreSchema>({
		name: 'settings',
		cwd: agentDirectory,
		accessPropertiesByDotNotation: false,
		defaults: DEFAULT_AGENT_STORE,
	});
	store.store = legacyStore.store;
}

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
