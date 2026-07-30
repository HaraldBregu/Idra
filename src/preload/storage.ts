import { typedInvokeUnwrap } from '../shared/ipc_types';
import { StorageChannels } from '../shared/ipc_channels_definitions';
import type { StorageApi } from './index.d';

export const storage: StorageApi = {
	getStorages: () => typedInvokeUnwrap(StorageChannels.getStorages),
	getStorageConfiguration: () => typedInvokeUnwrap(StorageChannels.getStorageConfiguration),
	saveStorageConfiguration: (configuration) =>
		typedInvokeUnwrap(StorageChannels.saveStorageConfiguration, configuration),
	saveStorageConfig: (config) => typedInvokeUnwrap(StorageChannels.saveStorageConfig, config),
	deleteStorageConfig: (id) => typedInvokeUnwrap(StorageChannels.deleteStorageConfig, id),
	testConnection: (config) => typedInvokeUnwrap(StorageChannels.testConnection, config),
	listObjects: (id, prefix) => typedInvokeUnwrap(StorageChannels.listObjects, id, prefix),
	putObject: (id, key, data, contentType) =>
		typedInvokeUnwrap(StorageChannels.putObject, id, key, data, contentType),
	getObject: (id, key) => typedInvokeUnwrap(StorageChannels.getObject, id, key),
	deleteObject: (id, key) => typedInvokeUnwrap(StorageChannels.deleteObject, id, key),
	sync: (id, localDir, prefix) => typedInvokeUnwrap(StorageChannels.sync, id, localDir, prefix),
	syncFolders: () => typedInvokeUnwrap(StorageChannels.syncFolders),
	pickFolders: () => typedInvokeUnwrap(StorageChannels.pickFolders),
	push: (id) => typedInvokeUnwrap(StorageChannels.push, id),
	pull: (id) => typedInvokeUnwrap(StorageChannels.pull, id),
};
