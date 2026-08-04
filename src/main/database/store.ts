import Store from 'electron-store';
import type { CatalogService, StoredProvider } from '../../shared/provider_types';
import type { DatabaseConfiguration } from '../../shared/database_types';
import { userDataLocation } from '../shared/user_data_location';
import { loadDatabases } from '../app/models';

const DEFAULT_CONFIGURATION: DatabaseConfiguration = {
	providerId: undefined,
	databaseId: undefined,
	providers: [],
};

const store = new Store<DatabaseConfiguration>({
	name: 'database',
	cwd: userDataLocation() + '/settings',
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CONFIGURATION,
});

export const databaseConfigurationStorePath = store.path;

export function getDatabaseConfiguration(): DatabaseConfiguration {
	const configuration = {
		...DEFAULT_CONFIGURATION,
		...store.store,
		providers: Array.isArray(store.store.providers)
			? store.store.providers.filter(isStoredProvider)
			: [],
	};
	if (configuration.databaseId && !findDatabase(configuration)) {
		configuration.providerId = undefined;
		configuration.databaseId = undefined;
	}
	return configuration;
}

export function saveDatabaseConfiguration(
	configuration: DatabaseConfiguration
): DatabaseConfiguration {
	if (configuration.databaseId && !findDatabase(configuration)) {
		throw new Error(`Database not found: ${configuration.databaseId}`);
	}
	const saved: DatabaseConfiguration = {
		providerId: configuration.providerId,
		databaseId: configuration.databaseId,
		providers: Array.isArray(configuration.providers)
			? configuration.providers.filter(isStoredProvider)
			: [],
	};
	store.store = saved;
	return saved;
}

function findDatabase(configuration: DatabaseConfiguration): CatalogService | undefined {
	return loadDatabases().find(
		(entry) =>
			entry.id === configuration.databaseId && entry.provider.id === configuration.providerId
	);
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
