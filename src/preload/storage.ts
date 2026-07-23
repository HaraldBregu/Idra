import { typedInvokeUnwrap } from '../shared/ipc_types';
import { StorageChannels } from '../shared/ipc_channels_definitions';
import type { StorageApi } from './index.d';

export const storage: StorageApi = {
	getStorages: () => typedInvokeUnwrap(StorageChannels.getStorages),
	saveStorageConfig: (config) => typedInvokeUnwrap(StorageChannels.saveStorageConfig, config),
	deleteStorageConfig: (id) => typedInvokeUnwrap(StorageChannels.deleteStorageConfig, id),
	testConnection: (config) => typedInvokeUnwrap(StorageChannels.testConnection, config),
	listObjects: (id, prefix) => typedInvokeUnwrap(StorageChannels.listObjects, id, prefix),
	putObject: (id, key, data, contentType) =>
		typedInvokeUnwrap(StorageChannels.putObject, id, key, data, contentType),
	getObject: (id, key) => typedInvokeUnwrap(StorageChannels.getObject, id, key),
	deleteObject: (id, key) => typedInvokeUnwrap(StorageChannels.deleteObject, id, key),
	sync: (id, localDir, prefix) => typedInvokeUnwrap(StorageChannels.sync, id, localDir, prefix),
	pickFiles: () => typedInvokeUnwrap(StorageChannels.pickFiles),
	push: (id) => typedInvokeUnwrap(StorageChannels.push, id),
};
