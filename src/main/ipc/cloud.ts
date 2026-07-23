import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { CloudChannels } from '../../shared/ipc_channels_definitions';
import {
	deleteObject,
	getCloudConfig,
	getObject,
	listObjects,
	pickFiles,
	putObject,
	pushFiles,
	setCloudConfig,
	syncDirectory,
	testConnection,
} from '../cloud';

export class CloudIpc implements IpcModule {
	readonly name = 'cloud';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(CloudChannels.getConfig, () => getCloudConfig());
		registerCommand(CloudChannels.saveConfig, (config) => setCloudConfig(config));
		registerCommand(CloudChannels.testConnection, (config) => testConnection(config));
		registerQuery(CloudChannels.listObjects, (prefix) => listObjects(prefix));
		registerCommand(CloudChannels.putObject, (key, data, contentType) =>
			putObject(key, data, contentType)
		);
		registerQuery(CloudChannels.getObject, (key) => getObject(key));
		registerCommand(CloudChannels.deleteObject, (key) => deleteObject(key));
		registerCommand(CloudChannels.sync, (localDir, prefix) => syncDirectory(localDir, prefix));
		registerCommand(CloudChannels.pickFiles, () => pickFiles());
		registerCommand(CloudChannels.push, () => pushFiles());
	}
}
