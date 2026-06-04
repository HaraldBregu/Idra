import { ipcMain } from 'electron';
import { shell } from 'electron';
import type { IpcModule } from './module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './errorHandler';
import { ConnectorsChannels } from '../../shared/ipc-channels';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const connectors = container.get('connectors');

		ipcMain.handle(
			ConnectorsChannels.list,
			wrapSimpleHandler(() => connectors.list(), ConnectorsChannels.list)
		);
		ipcMain.handle(
			ConnectorsChannels.get,
			wrapSimpleHandler((id: string) => connectors.get(id), ConnectorsChannels.get)
		);
		ipcMain.handle(
			ConnectorsChannels.save,
			wrapSimpleHandler((input) => connectors.save(input), ConnectorsChannels.save)
		);
		ipcMain.handle(
			ConnectorsChannels.connect,
			wrapSimpleHandler(
				(input) => connectors.connect(input, (url) => shell.openExternal(url)),
				ConnectorsChannels.connect
			)
		);

		logger.info('ConnectorsIpc', `Registered ${this.name} module`);
	}
}
