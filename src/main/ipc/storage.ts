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
	pickFiles,
	putObject,
	pushFiles,
	saveStorageConfig,
	syncDirectory,
	testConnection,
} from '../cloud/storage';

export class StorageIpc implements IpcModule {
	readonly name = 'storage';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(StorageChannels.getStorages, () => getStorages());
		registerCommand(StorageChannels.saveStorageConfig, (config) => saveStorageConfig(config));
		registerCommand(StorageChannels.deleteStorageConfig, (id) => deleteStorageConfig(id));
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
		registerCommand(StorageChannels.pickFiles, () => pickFiles());
		registerCommand(StorageChannels.push, (id) => pushFiles(id));
	}
}
