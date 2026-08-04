import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredProvider } from '../../../shared/provider_types';

interface SearchConfiguration {
	providerId?: string;
	searchId?: string;
}

interface SearchSettingsState extends SearchConfiguration {
	providers: StoredProvider[];
}

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const DEFAULT_SEARCH_SETTINGS: SearchSettingsState = { providers: [] };

const store = new Store<SearchSettingsState>({
	name: 'search',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SEARCH_SETTINGS,
});

export const searchStorePath = store.path;

export function getSearchConfiguration(): SearchConfiguration {
	const { providerId, searchId } = store.store;
	return { providerId, searchId };
}

export function saveSearchConfiguration(configuration: SearchConfiguration): void {
	store.store = { ...store.store, ...configuration };
}

export function getSearchProviders(): StoredProvider[] {
	return store.get('providers').filter(isStoredProvider);
}

export function setSearchProviders(providers: StoredProvider[]): void {
	store.set('providers', providers.filter(isStoredProvider));
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
