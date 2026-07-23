import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { FileStorageChannels } from '../../shared/ipc_channels_definitions';
import {
	deleteFileStorageConfig,
	deleteObject,
	getFileStorages,
	getObject,
	listObjects,
	pickFiles,
	putObject,
	pushFiles,
	saveFileStorageConfig,
	syncDirectory,
	testConnection,
} from '../file_storage';

export class FileStorageIpc implements IpcModule {
	readonly name = 'file-storage';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(FileStorageChannels.getFileStorages, () => getFileStorages());
		registerCommand(FileStorageChannels.saveFileStorageConfig, (config) =>
			saveFileStorageConfig(config)
		);
		registerCommand(FileStorageChannels.deleteFileStorageConfig, (id) =>
			deleteFileStorageConfig(id)
		);
		registerCommand(FileStorageChannels.testConnection, (config) => testConnection(config));
		registerQuery(FileStorageChannels.listObjects, (id, prefix) => listObjects(id, prefix));
		registerCommand(FileStorageChannels.putObject, (id, key, data, contentType) =>
			putObject(id, key, data, contentType)
		);
		registerQuery(FileStorageChannels.getObject, (id, key) => getObject(id, key));
		registerCommand(FileStorageChannels.deleteObject, (id, key) => deleteObject(id, key));
		registerCommand(FileStorageChannels.sync, (id, localDir, prefix) =>
			syncDirectory(id, localDir, prefix)
		);
		registerCommand(FileStorageChannels.pickFiles, () => pickFiles());
		registerCommand(FileStorageChannels.push, (id) => pushFiles(id));
	}
}
