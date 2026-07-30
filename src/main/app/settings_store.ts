import path from 'node:path';
import Store from 'electron-store';
import cron from 'node-cron';
import type {
	ResolvedProvider,
	StoredProvider,
	StoredProviderKind,
} from '../../shared/provider_types';
import type { StorageConfig, StorageConfiguration } from '../../shared/storage_types';
import { userDataLocation } from '../shared/user_data_location';
import { DEFAULT_SYNC_CRON_EXPRESSION } from '../cloud/storage/storage_sync_types';
import { loadStorages } from './models';
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
	modelProviderId: string | undefined;
	modelId: string | undefined;
	models: StoredProvider[];
	databases: StoredProvider[];
	storages: StoredStorage[];
	storage_configuration: StorageConfiguration;
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_STORAGE_CONFIGURATION: StorageConfiguration = {
	providerId: undefined,
	storageId: undefined,
	paths: [],
	syncEnabled: false,
	syncCronExpression: DEFAULT_SYNC_CRON_EXPRESSION,
};

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
	modelProviderId: undefined,
	modelId: undefined,
	models: [],
	databases: [],
	storages: [],
	storage_configuration: DEFAULT_STORAGE_CONFIGURATION,
};

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});

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

/** The selected provider resolved to the shape model adapters consume. */
export function getResolvedProvider(
	providerId: string | undefined = getProviderId()
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
		paths: Array.isArray(stored.paths)
			? stored.paths.filter((entry): entry is string => typeof entry === 'string')
			: [],
		syncEnabled: stored.syncEnabled === true,
		syncCronExpression:
			typeof stored.syncCronExpression === 'string' && stored.syncCronExpression.trim()
				? stored.syncCronExpression
				: DEFAULT_SYNC_CRON_EXPRESSION,
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
		paths: config.paths,
		syncEnabled: config.syncEnabled,
		syncCronExpression: config.syncCronExpression.trim().replace(/\s+/g, ' '),
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
	if (config.syncEnabled && !cron.validate(config.syncCronExpression)) {
		throw new Error('Storage sync schedule must be a valid cron expression.');
	}
	const saved = toStoredStorage({ ...config, id: config.id || crypto.randomUUID() });
	const storages = store.get('storages');
	const index = storages.findIndex((storage) => storage.id === saved.id);
	store.set(
		'storages',
		index >= 0
			? storages.map((storage, i) => (i === index ? saved : storage))
			: [...storages, saved]
	);
	if (!store.get('storageProviderId')) setSelectedStorageId(saved.id);
	return toStorageConfig(saved);
}

export function deleteStorageConfig(id: string): void {
	const storages = store.get('storages').filter((storage) => storage.id !== id);
	store.set('storages', storages);
	if (store.get('storageProviderId') === id) {
		const next = storages[0]?.id;
		if (next) setSelectedStorageId(next);
		else {
			store.delete('storageProviderId');
			store.delete('storageId');
		}
	}
}

export function getSelectedStorageId(): string | undefined {
	const id = store.get('storageProviderId');
	return id && store.get('storages').some((storage) => storage.id === id) ? id : undefined;
}

export function setSelectedStorageId(id: string): void {
	if (!store.get('storages').some((storage) => storage.id === id)) {
		throw new Error(`Storage not found: ${id}`);
	}
	store.set('storageProviderId', id);
	const storageId = loadStorages().find((entry) => entry.provider.id === id)?.id;
	if (storageId) store.set('storageId', storageId);
	else store.delete('storageId');
}

export function getProviderId(): string | undefined {
	return store.get('modelProviderId');
}

export function setProviderId(providerId: string): void {
	store.set('modelProviderId', providerId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}
