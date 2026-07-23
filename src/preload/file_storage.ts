import { typedInvokeUnwrap } from '../shared/ipc_types';
import { FileStorageChannels } from '../shared/ipc_channels_definitions';
import type { FileStorageApi } from './index.d';

export const fileStorage: FileStorageApi = {
	getFileStorages: () => typedInvokeUnwrap(FileStorageChannels.getFileStorages),
	saveFileStorageConfig: (config) =>
		typedInvokeUnwrap(FileStorageChannels.saveFileStorageConfig, config),
	deleteFileStorageConfig: (id) =>
		typedInvokeUnwrap(FileStorageChannels.deleteFileStorageConfig, id),
	testConnection: (config) => typedInvokeUnwrap(FileStorageChannels.testConnection, config),
	listObjects: (id, prefix) => typedInvokeUnwrap(FileStorageChannels.listObjects, id, prefix),
	putObject: (id, key, data, contentType) =>
		typedInvokeUnwrap(FileStorageChannels.putObject, id, key, data, contentType),
	getObject: (id, key) => typedInvokeUnwrap(FileStorageChannels.getObject, id, key),
	deleteObject: (id, key) => typedInvokeUnwrap(FileStorageChannels.deleteObject, id, key),
	sync: (id, localDir, prefix) => typedInvokeUnwrap(FileStorageChannels.sync, id, localDir, prefix),
	pickFiles: () => typedInvokeUnwrap(FileStorageChannels.pickFiles),
	push: (id) => typedInvokeUnwrap(FileStorageChannels.push, id),
};
