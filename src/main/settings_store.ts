import path from 'node:path';
import Store from 'electron-store';
import cron from 'node-cron';
import type { ResolvedProvider, StoredProvider, StoredProviderKind } from '../shared/provider_types';
import type { StorageConfig, StorageConfiguration } from '../shared/storage_types';
import type { DatabaseConfiguration } from '../shared/database_types';
import { userDataLocation } from './shared/user_data_location';
import { DEFAULT_SYNC_CRON_EXPRESSION } from './storage/storage_sync_types';
import { loadStorages } from './models';
import type { PersistedTaskState } from './tasks/tasks_types';
import type { AppLanguage, AppTheme } from '../shared/app_types';
import { getModelProvidersState, setModelProvidersState, getDatabaseProvidersState, setDatabaseProvidersState, getStorageProvidersState, setStorageProvidersState, type StoredStorage } from './providers/providers_index';

export type ModelKind =
	| 'text'
	| 'sound'
	| 'image'
	| 'video'
	| 'voice'
	| 'transcribe'
	| 'realtime'
	| 'embedding';

export type ModelSelection = {
	providerId: string;
	modelId: string;
};

export type ModelsStoreState = Record<ModelKind, ModelSelection>;

const EMPTY_MODEL_SELECTION: ModelSelection = { providerId: '', modelId: '' };

const DEFAULT_MODEL_SELECTIONS: ModelsStoreState = {
	text: EMPTY_MODEL_SELECTION,
	sound: EMPTY_MODEL_SELECTION,
	image: EMPTY_MODEL_SELECTION,
	video: EMPTY_MODEL_SELECTION,
	voice: EMPTY_MODEL_SELECTION,
	transcribe: EMPTY_MODEL_SELECTION,
	realtime: EMPTY_MODEL_SELECTION,
	embedding: EMPTY_MODEL_SELECTION,
};

export type AppSettingsState = {
	trayEnabled: boolean;
	keepAwake: boolean;
	language: AppLanguage;
	theme: AppTheme;
	databaseConfiguration: Omit<DatabaseConfiguration, 'providers'>;
	storageConfiguration: StorageConfiguration;
	modelSelections: ModelsStoreState;
};

const APP_SETTINGS_STORE_NAME = 'app';

const DEFAULT_STORAGE_CONFIGURATION: StorageConfiguration = {
	providerId: undefined,
	storageId: undefined,
	paths: [],
	syncEnabled: false,
	syncCronExpression: DEFAULT_SYNC_CRON_EXPRESSION,
};

const DEFAULT_TASK_CONFIGURATION: PersistedTaskState = { schedules: [] };

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
	databaseConfiguration: { providerId: undefined, databaseId: undefined },
	storageConfiguration: DEFAULT_STORAGE_CONFIGURATION,
	modelSelections: DEFAULT_MODEL_SELECTIONS,
};

const settingsDirectory = path.resolve(userDataLocation(), 'settings');

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});


export const appSettingsStorePath = store.path;

const taskConfigurationStore = new Store<PersistedTaskState>({
	name: 'tasks',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_TASK_CONFIGURATION,
});


export const taskConfigurationStorePath = taskConfigurationStore.path;

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

export function getAppModelSelections(): ModelsStoreState {
	return store.get('modelSelections');
}

export function setAppModelSelections(value: ModelsStoreState): void {
	store.set('modelSelections', value);
}

export function getAppDatabaseConfiguration(): Omit<DatabaseConfiguration, 'providers'> {
	return store.get('databaseConfiguration');
}

export function setAppDatabaseConfiguration(value: Omit<DatabaseConfiguration, 'providers'>): void {
	store.set('databaseConfiguration', value);
}

function readProviders(kind: StoredProviderKind): StoredProvider[] {
	if (kind === 'models') return getModelProvidersState();
	if (kind === 'databases') return getDatabaseProvidersState();
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
		setDatabaseProvidersState(providers);
	} else {
		setModelProvidersState(providers);
	}
	return provider;
}

export function deleteProvider(id: string): void {
	for (const kind of ['models', 'databases'] as const) {
		const providers = readProviders(kind);
		const remaining = providers.filter((provider) => provider.id !== id);
		if (remaining.length !== providers.length) {
			if (kind === 'databases') {
				setDatabaseProvidersState(remaining);
			} else {
				setModelProvidersState(remaining);
			}
		}
	}
}

export function clearProviders(): void {
	setModelProvidersState([]);
	setDatabaseProvidersState([]);
}

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
	const configuration = getStorageConfiguration();
	return getStoredStorages().map((storage) => ({
		...toStorageConfig(storage),
		paths: configuration.paths,
		syncEnabled: configuration.syncEnabled,
		syncCronExpression: configuration.syncCronExpression,
	}));
}

export function getStorage(id: string): StorageConfig | undefined {
	const storage = getStoredStorages().find((storage) => storage.id === id);
	return storage ? toStorageConfig(storage) : undefined;
}

export function saveStorageConfig(config: StorageConfig): StorageConfig {
	const configuration = config as StorageConfig & Partial<StorageConfiguration>;
	if (configuration.syncEnabled && !cron.validate(configuration.syncCronExpression ?? '')) {
		throw new Error('Storage sync schedule must be a valid cron expression.');
	}
	const saved = toStoredStorage({ ...config, id: config.id || crypto.randomUUID() });
	const storages = getStoredStorages();
	const index = storages.findIndex((storage) => storage.id === saved.id);
	setStorageProvidersState(index >= 0
		? storages.map((storage, i) => (i === index ? saved : storage))
		: [...storages, saved]);
	const current = getStorageConfiguration();
	if (configuration.paths || configuration.syncEnabled !== undefined || configuration.syncCronExpression) {
		saveStorageConfiguration({
			...current,
			providerId: current.providerId ?? saved.id,
			paths: configuration.paths ?? current.paths,
			syncEnabled: configuration.syncEnabled ?? current.syncEnabled,
			syncCronExpression: configuration.syncCronExpression ?? current.syncCronExpression,
		});
	} else if (!current.providerId) {
		saveStorageConfiguration({ ...current, providerId: saved.id });
	}
	return toStorageConfig(saved);
}

export function deleteStorageConfig(id: string): void {
	const configuration = getStorageConfiguration();
	const storages = getStoredStorages().filter((storage) => storage.id !== id);
	setStorageProvidersState(storages);
	if (configuration.providerId === id) {
		saveStorageConfiguration({ ...configuration, providerId: storages[0]?.id });
	}
}

export function getSelectedStorageId(): string | undefined {
	return getStorageConfiguration().providerId;
}

export function setSelectedStorageId(id: string): void {
	saveStorageConfiguration({ ...getStorageConfiguration(), providerId: id });
}

export function getStorageConfiguration(): StorageConfiguration {
	const configuration = {
		...DEFAULT_STORAGE_CONFIGURATION,
		...store.get('storageConfiguration'),
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
	store.set('storageConfiguration', saved);
	return saved;
}

function getStoredStorages(): StoredStorage[] {
	const providers = getStorageProvidersState();
	return Array.isArray(providers) ? providers : [];
}

export function getTaskConfiguration(): PersistedTaskState {
	const configuration = taskConfigurationStore.store;
	// Fresh array so in-place mutations never touch the shared defaults object
	return { ...configuration, schedules: [...(configuration.schedules ?? [])] };
}

export function setTaskConfiguration(configuration: PersistedTaskState): void {
	taskConfigurationStore.store = configuration;
}
