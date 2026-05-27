import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { ConnectorsChannels } from '../../shared/ipc-channels';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const connectors = container.get('connectors');

		ipcMain.handle(
			ConnectorsChannels.catalog,
			wrapSimpleHandler(() => connectors.catalog(), ConnectorsChannels.catalog)
		);
		ipcMain.handle(
			ConnectorsChannels.list,
			wrapSimpleHandler(() => connectors.list(), ConnectorsChannels.list)
		);
		ipcMain.handle(
			ConnectorsChannels.get,
			wrapSimpleHandler((id: string) => connectors.get(id), ConnectorsChannels.get)
		);
		ipcMain.handle(
			ConnectorsChannels.add,
			wrapSimpleHandler((input) => connectors.add(input), ConnectorsChannels.add)
		);
		ipcMain.handle(
			ConnectorsChannels.update,
			wrapSimpleHandler((id, input) => connectors.update(id, input), ConnectorsChannels.update)
		);
		ipcMain.handle(
			ConnectorsChannels.remove,
			wrapSimpleHandler((id: string) => connectors.remove(id), ConnectorsChannels.remove)
		);
		ipcMain.handle(
			ConnectorsChannels.enable,
			wrapSimpleHandler((id: string) => connectors.enable(id), ConnectorsChannels.enable)
		);
		ipcMain.handle(
			ConnectorsChannels.disable,
			wrapSimpleHandler((id: string) => connectors.disable(id), ConnectorsChannels.disable)
		);
		ipcMain.handle(
			ConnectorsChannels.test,
			wrapSimpleHandler((id: string) => connectors.test(id), ConnectorsChannels.test)
		);
		ipcMain.handle(
			ConnectorsChannels.reconnect,
			wrapSimpleHandler((id: string) => connectors.reconnect(id), ConnectorsChannels.reconnect)
		);
		ipcMain.handle(
			ConnectorsChannels.refreshTools,
			wrapSimpleHandler(
				(id: string) => connectors.refreshTools(id),
				ConnectorsChannels.refreshTools
			)
		);
		ipcMain.handle(
			ConnectorsChannels.listTools,
			wrapSimpleHandler((id: string) => connectors.listTools(id), ConnectorsChannels.listTools)
		);
		ipcMain.handle(
			ConnectorsChannels.callTool,
			wrapSimpleHandler(
				(id, name, args, options) => connectors.callTool(id, name, args, options),
				ConnectorsChannels.callTool
			)
		);
		ipcMain.handle(
			ConnectorsChannels.authorizeOAuth,
			wrapSimpleHandler(
				(input) => connectors.authorizeOAuth(input),
				ConnectorsChannels.authorizeOAuth
			)
		);

		logger.info('ConnectorsIpc', `Registered ${this.name} module`);
	}
}
