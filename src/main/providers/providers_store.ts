import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { SmtpProvider } from '../../shared/email_types';
import type { StoredBotProvider } from '../../shared/channels_types';
import type { StoredProvider } from '../../shared/provider_types';
import type { McpRecord } from '../mcp/mcp_types';
import type { ProvidersStoreState } from './providers_types';

const defaults: ProvidersStoreState = {
	databases: [],
	search_engines: [],
	smtp: [],
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

export function getSmtpProvidersState(): SmtpProvider[] {
	return store.get('smtp');
}

export function setSmtpProvidersState(value: SmtpProvider[]): void {
	store.set('smtp', value);
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
