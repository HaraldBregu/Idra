import path from 'node:path';
import Store from 'electron-store';
import type { StorageConfig } from '../../../shared/storage_types';
import { userDataLocation } from '../../shared/user_data_location';

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

export function getStorages(): StorageConfig[] {
	return store.store.storages;
}

export function getStorage(id: string): StorageConfig | undefined {
	return store.store.storages.find((storage) => storage.id === id);
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
