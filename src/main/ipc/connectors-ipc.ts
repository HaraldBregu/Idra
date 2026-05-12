import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { ConnectorsService } from '../connectors';
import { wrapSimpleHandler } from './ipc-error-handler';
import { ConnectorsChannels } from '../../shared/ipc-channels';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const logger = container.get<LoggerService>('logger');
		const connectors = container.get<ConnectorsService>('connectors');

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
			ConnectorsChannels.refreshTools,
			wrapSimpleHandler((id: string) => connectors.refreshTools(id), ConnectorsChannels.refreshTools)
		);
		ipcMain.handle(
			ConnectorsChannels.listTools,
			wrapSimpleHandler((id: string) => connectors.listTools(id), ConnectorsChannels.listTools)
		);

		logger.info('ConnectorsIpc', `Registered ${this.name} module`);
	}
}
