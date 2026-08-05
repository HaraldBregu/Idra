import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredProvider } from '../../../shared/provider_types';
import { setSearchEngine } from '../../agent/agent_store';

interface SearchSettingsState {
	providers: StoredProvider[];
}

type LegacySearchSettingsState = SearchSettingsState & {
	providerId?: unknown;
	searchId?: unknown;
};

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const DEFAULT_SEARCH_SETTINGS: SearchSettingsState = { providers: [] };

const store = new Store<SearchSettingsState>({
	name: 'search',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SEARCH_SETTINGS,
});

const persisted = store.store as LegacySearchSettingsState;
if (typeof persisted.providerId === 'string') {
	setSearchEngine({ providerId: persisted.providerId, providerName: '', enabled: true });
}
if ('providerId' in persisted || 'searchId' in persisted) {
	store.store = { providers: Array.isArray(persisted.providers) ? persisted.providers : [] };
}

export const searchStorePath = store.path;

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
