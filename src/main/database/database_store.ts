import type { CatalogService, StoredProvider } from '../../shared/provider_types';
import type { DatabaseConfiguration } from '../../shared/database_types';
import { loadDatabases } from '../models';
import { getAppDatabaseConfiguration, setAppDatabaseConfiguration } from '../settings_store';
import { getDatabaseProvidersState, providersStorePath, setDatabaseProvidersState } from '../providers/providers_index';

const DEFAULT_CONFIGURATION: DatabaseConfiguration = {
	providerId: undefined,
	databaseId: undefined,
	providers: [],
};

export const databaseConfigurationStorePath = providersStorePath;

export function getDatabaseConfiguration(): DatabaseConfiguration {
	const configuration = {
		...DEFAULT_CONFIGURATION,
		...getAppDatabaseConfiguration(),
		providers: Array.isArray(getDatabaseProvidersState())
			? getDatabaseProvidersState().filter(isStoredProvider)
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
	setDatabaseProvidersState(saved.providers);
	setAppDatabaseConfiguration({ providerId: saved.providerId, databaseId: saved.databaseId });
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
