import type { StoredProvider } from '../../shared/provider_types';
import type { StorageConfig } from '../../shared/storage_types';

export type StoredStorage = Omit<StorageConfig, 'forcePathStyle'> & {
	baseUrl: string;
	forcePathStyle?: boolean;
};

export type ProvidersStoreState = {
	models: StoredProvider[];
	databases: StoredProvider[];
	search_engines: StoredProvider[];
	storages: StoredStorage[];
};
