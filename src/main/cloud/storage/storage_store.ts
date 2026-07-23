import path from 'node:path';
import Store from 'electron-store';
import type { FileStorageConfig } from '../../../shared/file_storage_types';
import { userDataLocation } from '../../shared/user_data_location';

interface FileStorageStoreShape {
	storages: FileStorageConfig[];
}

const DEFAULT_STORE: FileStorageStoreShape = { storages: [] };

const store = new Store<FileStorageStoreShape>({
	name: 'file-storage',
	cwd: path.resolve(userDataLocation(), 'cloud'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_STORE,
});

export function getFileStorages(): FileStorageConfig[] {
	return store.store.storages;
}

export function getFileStorage(id: string): FileStorageConfig | undefined {
	return store.store.storages.find((storage) => storage.id === id);
}

export function saveFileStorageConfig(config: FileStorageConfig): FileStorageConfig {
	const saved: FileStorageConfig = { ...config, id: config.id || crypto.randomUUID() };
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

export function deleteFileStorageConfig(id: string): void {
	store.store = { storages: store.store.storages.filter((storage) => storage.id !== id) };
}
