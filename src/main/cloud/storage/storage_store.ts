import path from 'node:path';
import Store from 'electron-store';
import type { StorageConfig } from '../../../shared/storage_types';
import { agentLocation } from '../../shared/agent_location';
import { libraryLocation } from '../../shared/library_location';
import { userDataLocation } from '../../shared/user_data_location';
import { DEFAULT_SYNC_INTERVAL_MINUTES } from './storage_sync_types';

interface StorageStoreShape {
	storages: StorageConfig[];
}

const DEFAULT_STORE: StorageStoreShape = { storages: [] };

const store = new Store<StorageStoreShape>({
	name: 'storage',
	cwd: path.resolve(userDataLocation(), 'cloud'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_STORE,
});

// Reads saved before the `filePaths` -> `paths` rename won't have `paths` yet,
// and reads saved before `syncIntervalMinutes` was introduced won't have it either.
function normalizeStorage(config: StorageConfig & { filePaths?: string[] }): StorageConfig {
	const { filePaths, ...rest } = config;
	return {
		...rest,
		paths: rest.paths ?? filePaths ?? [],
		syncIntervalMinutes: rest.syncIntervalMinutes ?? DEFAULT_SYNC_INTERVAL_MINUTES,
	};
}

export function getStorages(): StorageConfig[] {
	return store.store.storages.map(normalizeStorage);
}

export function getStorage(id: string): StorageConfig | undefined {
	const storage = store.store.storages.find((storage) => storage.id === id);
	return storage ? normalizeStorage(storage) : undefined;
}

export function saveStorageConfig(config: StorageConfig): StorageConfig {
	const saved: StorageConfig = { ...config, id: config.id || crypto.randomUUID() };
	const storages = store.store.storages;
	const index = storages.findIndex((storage) => storage.id === saved.id);
	store.store = {
		storages:
			index >= 0
				? storages.map((storage, i) => (i === index ? saved : storage))
				: [...storages, saved],
	};
	return saved;
}

export function deleteStorageConfig(id: string): void {
	store.store = { storages: store.store.storages.filter((storage) => storage.id !== id) };
}
