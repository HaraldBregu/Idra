import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { StoredBotProvider } from '../../shared/channels_types';
import type { StoredProvider } from '../../shared/provider_types';
import type { McpRecord } from '../mcp/mcp_types';
import type { ProvidersStoreState } from './providers_types';

const defaults: ProvidersStoreState = {
	models: [],
	databases: [],
	search_engines: [],
	storages: [],
	channels: [],
	mcp_servers: [],
};

const store = new Store<ProvidersStoreState>({
	name: 'providers',
	cwd: path.resolve(userDataLocation(), 'settings'),
	accessPropertiesByDotNotation: false,
	defaults,
});

export const providersStorePath = store.path;

export function getModelProvidersState(): ProvidersStoreState['models'] {
	return store.get('models').filter(isStoredProvider);
}

export function setModelProvidersState(value: ProvidersStoreState['models']): void {
	store.set('models', value.filter(isStoredProvider));
}

export function getDatabaseProvidersState(): ProvidersStoreState['databases'] {
	return store.get('databases');
}

export function setDatabaseProvidersState(value: ProvidersStoreState['databases']): void {
	store.set('databases', value);
}

export function getSearchEngines(): StoredProvider[] {
	return store.get('search_engines');
}

export function setSearchEngines(value: StoredProvider[]): void {
	store.set('search_engines', value);
}

export function getStorageProvidersState(): ProvidersStoreState['storages'] {
	return store.get('storages');
}

export function setStorageProvidersState(value: ProvidersStoreState['storages']): void {
	store.set('storages', value);
}

export function getChannelProvidersState(): StoredBotProvider[] {
	return store.get('channels');
}

export function setChannelProvidersState(value: StoredBotProvider[]): void {
	store.set('channels', value);
}

export function getMcpServersState(): McpRecord[] {
	return store.get('mcp_servers');
}

export function setMcpServersState(value: McpRecord[]): void {
	store.set('mcp_servers', value);
}

function isStoredProvider(value: unknown): value is StoredProvider {
	if (typeof value !== 'object' || value === null) return false;
	const provider = value as Partial<StoredProvider>;
	return (
		typeof provider.id === 'string' &&
		typeof provider.name === 'string' &&
		typeof provider.apiKey === 'string' &&
		typeof provider.baseUrl === 'string'
	);
}
