import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
};

const APP_SETTINGS_STORE_NAME = 'application';

const DEFAULT_STORAGE_CONFIGURATION: StorageConfiguration = {
	providerId: undefined,
	storageId: undefined,
	paths: [],
	syncEnabled: false,
	syncCronExpression: DEFAULT_SYNC_CRON_EXPRESSION,
};

type StorageSettingsState = StorageConfiguration & {
	providers: StoredStorage[];
};

const DEFAULT_STORAGE_SETTINGS: StorageSettingsState = {
	...DEFAULT_STORAGE_CONFIGURATION,
	providers: [],
};

const DEFAULT_DATABASE_CONFIGURATION: DatabaseConfiguration = {
	providerId: undefined,
	databaseId: undefined,
	providers: [],
};

const DEFAULT_CRON_CONFIGURATION: PersistedCronState = { schedules: [] };

type ModelsSettingsState = {
	providers: StoredProvider[];
};

const DEFAULT_MODELS_SETTINGS: ModelsSettingsState = { providers: [] };

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
};

const appSettingsDirectory = path.resolve(userDataLocation(), 'app');
const applicationSettingsPath = path.join(appSettingsDirectory, 'application.json');
const hasApplicationSettings = existsSync(applicationSettingsPath);
const legacyAppSettings = readSettingsFile('settings.json');
const legacyApplicationSettings = {
	...legacyAppSettings,
	...readSettingsFile('app.json'),
	...readSettingsFile('application.json'),
};
const modelsSettingsPath = path.join(appSettingsDirectory, 'models.json');
const hasModelsSettings = existsSync(modelsSettingsPath);
const storageConfigurationPath = path.join(appSettingsDirectory, 'storages.json');
const hasStorageConfiguration = existsSync(storageConfigurationPath);
const databaseConfigurationPath = path.join(appSettingsDirectory, 'database.json');
const hasDatabaseConfiguration = existsSync(databaseConfigurationPath);
const cronConfigurationPath = path.join(appSettingsDirectory, 'cron.json');
const hasCronConfiguration = existsSync(cronConfigurationPath);

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});

if (!hasApplicationSettings) {
	store.store = {
		...DEFAULT_APP_SETTINGS,
		...readLegacyAppConfiguration(),
	};
}

export const appSettingsStorePath = store.path;

const modelsConfigurationStore = new Store<ModelsSettingsState>({
	name: 'models',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_MODELS_SETTINGS,
});

if (!hasModelsSettings) {
	modelsConfigurationStore.store = { providers: readLegacyModelProviders() };
}
removeLegacyModelProviders();

const storageConfigurationStore = new Store<StorageSettingsState>({
	name: 'storages',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_STORAGE_SETTINGS,
});

if (!hasStorageConfiguration) {
	storageConfigurationStore.store = {
		...DEFAULT_STORAGE_SETTINGS,
		...readLegacyStorageConfiguration(),
		providers: readLegacyStorageProviders(),
	};
}
removeLegacyStorageProviders();

const databaseConfigurationStore = new Store<DatabaseConfiguration>({
	name: 'database',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_DATABASE_CONFIGURATION,
});

if (!hasDatabaseConfiguration) {
	databaseConfigurationStore.store = {
		...DEFAULT_DATABASE_CONFIGURATION,
		...readLegacyDatabaseConfiguration(),
		providers: readLegacyDatabaseProviders(),
	};
}

const cronConfigurationStore = new Store<PersistedCronState>({
	name: 'cron',
	cwd: appSettingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CRON_CONFIGURATION,
});

if (!hasCronConfiguration) {
	cronConfigurationStore.store = readLegacyCronConfiguration();
}

export const storageConfigurationStorePath = storageConfigurationStore.path;
export const modelsConfigurationStorePath = modelsConfigurationStore.path;
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
	if (kind === 'models') return getModelProviders();
	if (kind === 'databases') return getDatabaseConfiguration().providers;
	if (kind === 'bots') return [];
	return [];
}

export function listProviders(kind?: StoredProviderKind): StoredProvider[] {
	return kind
		? readProviders(kind)
		: [...readProviders('models'), ...readProviders('databases')];
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
	if (kind === 'bots') {
		throw new Error('Bot providers are stored in channels settings.');
	}
	const providers = readProviders(kind);
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	if (kind === 'databases') {
		saveDatabaseConfiguration({ ...getDatabaseConfiguration(), providers });
	} else {
		modelsConfigurationStore.set('providers', providers);
	}
	return provider;
}

export function deleteProvider(id: string): void {
	for (const kind of ['models', 'databases'] as const) {
		const providers = readProviders(kind);
		const remaining = providers.filter((provider) => provider.id !== id);
		if (remaining.length !== providers.length) {
			if (kind === 'databases') {
				saveDatabaseConfiguration({ ...getDatabaseConfiguration(), providers: remaining });
			} else {
				modelsConfigurationStore.set('providers', remaining);
			}
		}
	}
}

export function clearProviders(): void {
	modelsConfigurationStore.set('providers', []);
	saveDatabaseConfiguration({ ...getDatabaseConfiguration(), providers: [] });
}

export function getLegacyBotProviders(): StoredProvider[] {
	const bots = legacyAppSettings.bots;
	return Array.isArray(bots) ? bots.filter(isStoredProvider) : [];
}

export function removeLegacyBotProviders(): void {}

export function getLegacySearchProviders(): StoredProvider[] {
	const search = legacyAppSettings.search;
	return Array.isArray(search) ? search.filter(isStoredProvider) : [];
}

export function removeLegacySearchProviders(): void {}

export function getLegacyEmailProviders(): StoredProvider[] {
	const email = legacyAppSettings.email;
	return Array.isArray(email) ? email.filter(isStoredProvider) : [];
}

export function removeLegacyEmailProviders(): void {}

/** The selected provider resolved to the shape model adapters consume. */
export function getResolvedProvider(providerId: string | undefined): ResolvedProvider | undefined {
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

function readSettingsFile(filename: string): Record<string, unknown> {
	const legacyPath = path.join(appSettingsDirectory, filename);
	if (!existsSync(legacyPath)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function readLegacyAppConfiguration(): Partial<AppSettingsState> {
	return {
		trayEnabled:
			typeof legacyApplicationSettings.trayEnabled === 'boolean'
				? legacyApplicationSettings.trayEnabled
				: DEFAULT_APP_SETTINGS.trayEnabled,
		keepAwake:
			typeof legacyApplicationSettings.keepAwake === 'boolean'
				? legacyApplicationSettings.keepAwake
				: DEFAULT_APP_SETTINGS.keepAwake,
		language:
			typeof legacyApplicationSettings.language === 'string'
				? (legacyApplicationSettings.language as AppLanguage)
				: DEFAULT_APP_SETTINGS.language,
		theme:
			typeof legacyApplicationSettings.theme === 'string'
				? (legacyApplicationSettings.theme as AppTheme)
				: DEFAULT_APP_SETTINGS.theme,
	};
}

function getModelProviders(): StoredProvider[] {
	return modelsConfigurationStore.get('providers').filter(isStoredProvider);
}

function readLegacyModelProviders(): StoredProvider[] {
	const models = legacyApplicationSettings.models;
	return Array.isArray(models) ? models.filter(isStoredProvider) : [];
}

function removeLegacyModelProviders(): void {
	const { models: _models, ...settings } = store.store as AppSettingsState & { models?: unknown };
	store.store = settings;
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
	return getStoredStorages().map(toStorageConfig);
}

export function getStorage(id: string): StorageConfig | undefined {
	const storage = getStoredStorages().find((storage) => storage.id === id);
	return storage ? toStorageConfig(storage) : undefined;
}

export function saveStorageConfig(config: StorageConfig): StorageConfig {
	const saved = toStoredStorage({ ...config, id: config.id || crypto.randomUUID() });
	const storages = getStoredStorages();
	const index = storages.findIndex((storage) => storage.id === saved.id);
	storageConfigurationStore.set(
		'providers',
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
	const storages = getStoredStorages().filter((storage) => storage.id !== id);
	storageConfigurationStore.set('providers', storages);
	const configuration = getStorageConfiguration();
	if (configuration.providerId === id) {
		saveStorageConfiguration({ ...configuration, providerId: storages[0]?.id });
	}
}

export function getStorageConfiguration(): StorageConfiguration {
	const { providers: _providers, ...configuration } = {
		...DEFAULT_STORAGE_CONFIGURATION,
		...storageConfigurationStore.store,
	};
	if (
		configuration.providerId &&
		!getStoredStorages().some((storage) => storage.id === configuration.providerId)
	) {
		configuration.providerId = undefined;
		configuration.storageId = undefined;
	}
	return configuration;
}

export function saveStorageConfiguration(
	configuration: StorageConfiguration
): StorageConfiguration {
	if (configuration.syncEnabled && !cron.validate(configuration.syncCronExpression)) {
		throw new Error('Storage sync schedule must be a valid cron expression.');
	}
	if (
		configuration.providerId &&
		!getStoredStorages().some((storage) => storage.id === configuration.providerId)
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
	storageConfigurationStore.store = {
		...storageConfigurationStore.store,
		...saved,
	};
	return saved;
}

function getStoredStorages(): StoredStorage[] {
	const providers = storageConfigurationStore.get('providers');
	return Array.isArray(providers) ? providers : [];
}

function readLegacyStorageConfiguration(): Partial<StorageConfiguration> {
	const legacyPath = path.join(appSettingsDirectory, 'settings.storage.json');
	if (!existsSync(legacyPath)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		if (typeof value !== 'object' || value === null) return {};
		const configuration = value as Partial<StorageConfiguration>;
		return {
			providerId: typeof configuration.providerId === 'string' ? configuration.providerId : undefined,
			storageId: typeof configuration.storageId === 'string' ? configuration.storageId : undefined,
			paths: Array.isArray(configuration.paths)
				? configuration.paths.filter((entry): entry is string => typeof entry === 'string')
				: [],
			syncEnabled: configuration.syncEnabled === true,
			syncCronExpression:
				typeof configuration.syncCronExpression === 'string'
					? configuration.syncCronExpression
					: DEFAULT_SYNC_CRON_EXPRESSION,
		};
	} catch {
		return {};
	}
}

function readLegacyStorageProviders(): StoredStorage[] {
	const storages = legacyAppSettings.storages;
	return Array.isArray(storages) ? (storages as StoredStorage[]) : [];
}

function removeLegacyStorageProviders(): void {}

export function getDatabaseConfiguration(): DatabaseConfiguration {
	const configuration = {
		...DEFAULT_DATABASE_CONFIGURATION,
		...databaseConfigurationStore.store,
		providers: Array.isArray(databaseConfigurationStore.store.providers)
			? databaseConfigurationStore.store.providers.filter(isStoredProvider)
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
	databaseConfigurationStore.store = saved;
	return saved;
}

function readLegacyDatabaseConfiguration(): Partial<DatabaseConfiguration> {
	const legacyPath = path.join(appSettingsDirectory, 'settings.database.json');
	if (!existsSync(legacyPath)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		if (typeof value !== 'object' || value === null) return {};
		const configuration = value as Partial<DatabaseConfiguration>;
		return {
			providerId: typeof configuration.providerId === 'string' ? configuration.providerId : undefined,
			databaseId: typeof configuration.databaseId === 'string' ? configuration.databaseId : undefined,
		};
	} catch {
		return {};
	}
}

function readLegacyDatabaseProviders(): StoredProvider[] {
	const value = legacyAppSettings.databases;
	return Array.isArray(value) ? value.filter(isStoredProvider) : [];
}

function findDatabase(configuration: DatabaseConfiguration): CatalogService | undefined {
	return loadDatabases().find(
		(entry) =>
			entry.id === configuration.databaseId && entry.provider.id === configuration.providerId
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

function readLegacyCronConfiguration(): PersistedCronState {
	const legacyPath = path.join(appSettingsDirectory, 'settings.cron.json');
	if (!existsSync(legacyPath)) return DEFAULT_CRON_CONFIGURATION;
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		return typeof value === 'object' && value !== null && Array.isArray((value as PersistedCronState).schedules)
			? (value as PersistedCronState)
			: DEFAULT_CRON_CONFIGURATION;
	} catch {
		return DEFAULT_CRON_CONFIGURATION;
	}
}
