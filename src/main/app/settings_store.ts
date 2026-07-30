import path from 'node:path';
import Store from 'electron-store';
import cron from 'node-cron';
import type {
	CatalogService,
	ResolvedProvider,
	StoredProvider,
	StoredProviderKind,
} from '../../shared/provider_types';
import type { StorageConfig, StorageConfiguration } from '../../shared/storage_types';
import type { DatabaseConfiguration } from '../../shared/database_types';
import { userDataLocation } from '../shared/user_data_location';
import { DEFAULT_SYNC_CRON_EXPRESSION } from './storage/storage_sync_types';
import { loadDatabases, loadStorages } from './models';
import type { PersistedCronState } from './cron/cron_types';
import type { AppLanguage, AppTheme } from '../../shared/app_types';

type StoredStorage = Omit<StorageConfig, 'forcePathStyle'> & {
	/** API base of the catalog storage entry this config belongs to. */
	baseUrl: string;
	forcePathStyle?: boolean;
};

export type AppSettingsState = {
	trayEnabled: boolean;
	keepAwake: boolean;
	language: AppLanguage;
	theme: AppTheme;
	models: StoredProvider[];
	databases: StoredProvider[];
	search: StoredProvider[];
	storages: StoredStorage[];
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_STORAGE_CONFIGURATION: StorageConfiguration = {
	providerId: undefined,
	storageId: undefined,
	paths: [],
	syncEnabled: false,
	syncCronExpression: DEFAULT_SYNC_CRON_EXPRESSION,
};

const DEFAULT_DATABASE_CONFIGURATION: DatabaseConfiguration = {
	providerId: undefined,
	databaseId: undefined,
};

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
	models: [],
	databases: [],
	search: [],
	storages: [],
};

const appSettingsDirectory = path.resolve(userDataLocation(), 'app');

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});

export const appSettingsStorePath = store.path;

const storageConfigurationStore = new Store<StorageConfiguration>({
	name: 'settings.storage',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_STORAGE_CONFIGURATION,
});

const databaseConfigurationStore = new Store<DatabaseConfiguration>({
	name: 'settings.database',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_DATABASE_CONFIGURATION,
});

const cronConfigurationStore = new Store<PersistedCronState>({
	name: 'settings.cron',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: { schedules: [] },
});

export const storageConfigurationStorePath = storageConfigurationStore.path;
export const databaseConfigurationStorePath = databaseConfigurationStore.path;
export const cronConfigurationStorePath = cronConfigurationStore.path;

export function getTrayEnabled(): boolean {
	return store.get('trayEnabled');
}

export function setTrayEnabled(enabled: boolean): void {
	store.set('trayEnabled', enabled);
}

export function getKeepAwake(): boolean {
	return store.get('keepAwake');
}

export function setKeepAwake(enabled: boolean): void {
	store.set('keepAwake', enabled);
}

export function getLanguage(): AppLanguage {
	return store.get('language');
}

export function setLanguage(language: AppLanguage): void {
	store.set('language', language);
}

export function getTheme(): AppTheme {
	return store.get('theme');
}

export function setTheme(theme: AppTheme): void {
	store.set('theme', theme);
}

function readProviders(kind: StoredProviderKind): StoredProvider[] {
	const raw = store.get(kind);
	return Array.isArray(raw) ? raw.filter(isStoredProvider) : [];
}

export function listProviders(kind?: StoredProviderKind): StoredProvider[] {
	return kind ? readProviders(kind) : [...readProviders('models'), ...readProviders('databases')];
}

export function getProvider(id: string): StoredProvider | undefined {
	return listProviders().find((provider) => provider.id === id);
}

export function hasProvider(id: string): boolean {
	return getProvider(id) !== undefined;
}

export function setProvider(
	provider: StoredProvider,
	kind: StoredProviderKind = 'models'
): StoredProvider {
	const providers = readProviders(kind);
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	store.set(kind, providers);
	return provider;
}

export function deleteProvider(id: string): void {
	for (const kind of ['models', 'databases'] as const) {
		const providers = readProviders(kind);
		const remaining = providers.filter((provider) => provider.id !== id);
		if (remaining.length !== providers.length) store.set(kind, remaining);
	}
}

export function clearProviders(): void {
	store.set('models', []);
	store.set('databases', []);
}

export function getSearchProviders(): StoredProvider[] {
	const raw = store.get('search');
	return Array.isArray(raw) ? raw.filter(isStoredProvider) : [];
}

export function setSearchProviders(providers: StoredProvider[]): void {
	store.set('search', providers.filter(isStoredProvider));
}

/** The selected provider resolved to the shape model adapters consume. */
export function getResolvedProvider(
	providerId: string | undefined
): ResolvedProvider | undefined {
	if (!providerId) return undefined;
	const provider = getProvider(providerId);
	if (!provider) return undefined;
	return {
		id: providerId,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
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

function toStorageConfig(stored: StoredStorage): StorageConfig {
	return {
		id: stored.id,
		name: stored.name,
		endpoint: stored.endpoint,
		region: stored.region,
		accessKeyId: stored.accessKeyId,
		secretAccessKey: stored.secretAccessKey,
		bucket: stored.bucket,
		forcePathStyle: stored.forcePathStyle === true,
	};
}

function toStoredStorage(config: StorageConfig): StoredStorage {
	return {
		id: config.id,
		name: config.name,
		endpoint: config.endpoint,
		region: config.region,
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		bucket: config.bucket,
		forcePathStyle: config.forcePathStyle,
		baseUrl: loadStorages().find((entry) => entry.provider.id === config.id)?.url ?? '',
	};
}

export function getStorages(): StorageConfig[] {
	return store.get('storages').map(toStorageConfig);
}

export function getStorage(id: string): StorageConfig | undefined {
	const storage = store.get('storages').find((storage) => storage.id === id);
	return storage ? toStorageConfig(storage) : undefined;
}

export function saveStorageConfig(config: StorageConfig): StorageConfig {
	const saved = toStoredStorage({ ...config, id: config.id || crypto.randomUUID() });
	const storages = store.get('storages');
	const index = storages.findIndex((storage) => storage.id === saved.id);
	store.set(
		'storages',
		index >= 0
			? storages.map((storage, i) => (i === index ? saved : storage))
			: [...storages, saved]
	);
	if (!getStorageConfiguration().providerId) {
		saveStorageConfiguration({ ...getStorageConfiguration(), providerId: saved.id });
	}
	return toStorageConfig(saved);
}

export function deleteStorageConfig(id: string): void {
	const storages = store.get('storages').filter((storage) => storage.id !== id);
	store.set('storages', storages);
	const configuration = getStorageConfiguration();
	if (configuration.providerId === id) {
		saveStorageConfiguration({ ...configuration, providerId: storages[0]?.id });
	}
}

export function getStorageConfiguration(): StorageConfiguration {
	const configuration = {
		...DEFAULT_STORAGE_CONFIGURATION,
		...storageConfigurationStore.store,
	};
	if (
		configuration.providerId &&
		!store.get('storages').some((storage) => storage.id === configuration.providerId)
	) {
		configuration.providerId = undefined;
		configuration.storageId = undefined;
	}
	return configuration;
}

export function saveStorageConfiguration(configuration: StorageConfiguration): StorageConfiguration {
	if (configuration.syncEnabled && !cron.validate(configuration.syncCronExpression)) {
		throw new Error('Storage sync schedule must be a valid cron expression.');
	}
	if (
		configuration.providerId &&
		!store.get('storages').some((storage) => storage.id === configuration.providerId)
	) {
		throw new Error(`Storage not found: ${configuration.providerId}`);
	}
	const saved: StorageConfiguration = {
		providerId: configuration.providerId,
		storageId: configuration.providerId
			? loadStorages().find((entry) => entry.provider.id === configuration.providerId)?.id
			: undefined,
		paths: configuration.paths.filter((entry) => typeof entry === 'string'),
		syncEnabled: configuration.syncEnabled,
		syncCronExpression: configuration.syncCronExpression.trim().replace(/\s+/g, ' '),
	};
	storageConfigurationStore.store = saved;
	return saved;
}

export function getDatabaseConfiguration(): DatabaseConfiguration {
	const configuration = {
		...DEFAULT_DATABASE_CONFIGURATION,
		...databaseConfigurationStore.store,
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
	};
	databaseConfigurationStore.store = saved;
	return saved;
}

function findDatabase(configuration: DatabaseConfiguration): CatalogService | undefined {
	return loadDatabases().find(
		(entry) => entry.id === configuration.databaseId && entry.provider.id === configuration.providerId
	);
}

export function getCronConfiguration(): PersistedCronState {
	const configuration = cronConfigurationStore.store;
	// Fresh array so in-place mutations never touch the shared defaults object
	return { ...configuration, schedules: [...(configuration.schedules ?? [])] };
}

export function setCronConfiguration(configuration: PersistedCronState): void {
	cronConfigurationStore.store = configuration;
}
