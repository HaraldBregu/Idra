import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { StorageChannels } from '../../shared/ipc_channels_definitions';
import {
	deleteObject,
	deleteStorageConfig,
	getObject,
	getStorages,
	listObjects,
	putObject,
	pushFiles,
	rescheduleStorageSync,
	saveStorageConfig,
	syncDirectory,
	syncFolders,
	testConnection,
} from '../cloud/storage';

export class StorageIpc implements IpcModule {
	readonly name = 'storage';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(StorageChannels.getStorages, () => getStorages());
		registerCommand(StorageChannels.saveStorageConfig, (config) => {
			const saved = saveStorageConfig(config);
			rescheduleStorageSync();
			return saved;
		});
		registerCommand(StorageChannels.deleteStorageConfig, (id) => {
			deleteStorageConfig(id);
			rescheduleStorageSync();
		});
		registerCommand(StorageChannels.testConnection, (config) => testConnection(config));
		registerQuery(StorageChannels.listObjects, (id, prefix) => listObjects(id, prefix));
		registerCommand(StorageChannels.putObject, (id, key, data, contentType) =>
			putObject(id, key, data, contentType)
		);
		registerQuery(StorageChannels.getObject, (id, key) => getObject(id, key));
		registerCommand(StorageChannels.deleteObject, (id, key) => deleteObject(id, key));
		registerCommand(StorageChannels.sync, (id, localDir, prefix) =>
			syncDirectory(id, localDir, prefix)
		);
		registerQuery(StorageChannels.syncFolders, () => syncFolders());
		registerCommand(StorageChannels.push, (id) => pushFiles(id));
	}
}
