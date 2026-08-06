import type { CatalogService, StoredProvider } from '../../shared/provider_types';
import type { DatabaseConfiguration } from '../../shared/database_types';
import { loadDatabases } from '../models';
import { getDatabaseProvidersState, setDatabaseProvidersState } from '../providers/providers_index';
import {
	getRagConfiguration,
	ragConfigurationStorePath,
	saveRagConfiguration,
} from '../rag/rag_store';

const DEFAULT_CONFIGURATION: DatabaseConfiguration = {
	providerId: undefined,
	databaseId: undefined,
	providers: [],
};

export const databaseConfigurationStorePath = ragConfigurationStorePath;

export function getDatabaseConfiguration(): DatabaseConfiguration {
	const ragConfiguration = getRagConfiguration();
	const configuration = {
		...DEFAULT_CONFIGURATION,
		providerId: ragConfiguration.databaseProviderId || undefined,
		databaseId: ragConfiguration.databaseId || undefined,
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
	saveRagConfiguration({
		...getRagConfiguration(),
		databaseProviderId: saved.providerId ?? '',
		databaseId: saved.databaseId ?? '',
	});
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
