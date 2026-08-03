import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredProvider } from '../../../shared/provider_types';
import { getLegacySearchProviders, removeLegacySearchProviders } from '../settings_store';

interface SearchConfiguration {
	providerId?: string;
	searchId?: string;
}

interface SearchSettingsState extends SearchConfiguration {
	providers: StoredProvider[];
}

const appSettingsDirectory = path.resolve(userDataLocation(), 'app');
const searchStorePathname = path.join(appSettingsDirectory, 'search.json');
const hasSearchStore = existsSync(searchStorePathname);
const DEFAULT_SEARCH_SETTINGS: SearchSettingsState = { providers: [] };

const store = new Store<SearchSettingsState>({
	name: 'search',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SEARCH_SETTINGS,
});

if (!hasSearchStore) {
	store.store = {
		...DEFAULT_SEARCH_SETTINGS,
		...readLegacySearchConfiguration(),
		providers: getLegacySearchProviders(),
	};
}
removeLegacySearchProviders();

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

function readLegacySearchConfiguration(): SearchConfiguration {
	const legacyPath = path.join(appSettingsDirectory, 'settings.search.json');
	if (!existsSync(legacyPath)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		if (typeof value !== 'object' || value === null) return {};
		const configuration = value as SearchConfiguration;
		return {
			providerId: typeof configuration.providerId === 'string' ? configuration.providerId : undefined,
			searchId: typeof configuration.searchId === 'string' ? configuration.searchId : undefined,
		};
	} catch {
		return {};
	}
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
