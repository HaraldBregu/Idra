import path from 'node:path';
import Store from 'electron-store';
import type {
	ResolvedProvider,
	StoredProvider,
	StoredProviderKind,
} from '../../shared/provider_types';
import type { StorageConfig } from '../../shared/storage_types';
import { userDataLocation } from '../shared/user_data_location';
import { DEFAULT_SYNC_INTERVAL_MINUTES } from '../cloud/storage/storage_sync_types';
import type { AppLanguage, AppTheme } from '../../shared/app_types';

/** ponytail: runtime/sync fields are not persisted; reads rebuild them with defaults. */
type StoredStorage = Omit<StorageConfig, 'forcePathStyle' | 'paths' | 'syncIntervalMinutes'>;

export type AppSettingsState = {
	trayEnabled: boolean;
	keepAwake: boolean;
	language: AppLanguage;
	theme: AppTheme;
	providerId: string | undefined;
	modelId: string | undefined;
	models: StoredProvider[];
	databases: StoredProvider[];
	storages: StoredStorage[];
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
	providerId: undefined,
	modelId: undefined,
	models: [],
	databases: [],
	storages: [],
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
		...stored,
		forcePathStyle: false,
		paths: [],
		syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
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
		index >= 0 ? storages.map((storage, i) => (i === index ? saved : storage)) : [...storages, saved]
	);
	return toStorageConfig(saved);
}

export function deleteStorageConfig(id: string): void {
	store.set(
		'storages',
		store.get('storages').filter((storage) => storage.id !== id)
	);
}

export function getProviderId(): string | undefined {
	return store.get('providerId');
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}
