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
		const mcpClient = container.get('mcpClient');

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
			wrapSimpleHandler(async (id: string, input) => {
				const connector = await connectors.update(id, input);
				await mcpClient.closeConnector(id);
				return connector;
			}, ConnectorsChannels.update)
		);
		ipcMain.handle(
			ConnectorsChannels.remove,
			wrapSimpleHandler(async (id: string) => {
				await connectors.remove(id);
				await mcpClient.closeConnector(id);
			}, ConnectorsChannels.remove)
		);
		ipcMain.handle(
			ConnectorsChannels.enable,
			wrapSimpleHandler(async (id: string) => {
				const connector = await connectors.enable(id);
				await mcpClient.closeConnector(id);
				return connector;
			}, ConnectorsChannels.enable)
		);
		ipcMain.handle(
			ConnectorsChannels.disable,
			wrapSimpleHandler(async (id: string) => {
				const connector = await connectors.disable(id);
				await mcpClient.closeConnector(id);
				return connector;
			}, ConnectorsChannels.disable)
		);
		ipcMain.handle(
			ConnectorsChannels.test,
			wrapSimpleHandler((id: string) => mcpClient.test(id), ConnectorsChannels.test)
		);
		ipcMain.handle(
			ConnectorsChannels.reconnect,
			wrapSimpleHandler((id: string) => mcpClient.reconnect(id), ConnectorsChannels.reconnect)
		);
		ipcMain.handle(
			ConnectorsChannels.refreshTools,
			wrapSimpleHandler(
				(id: string) => mcpClient.refreshTools(id),
				ConnectorsChannels.refreshTools
			)
		);
		ipcMain.handle(
			ConnectorsChannels.listTools,
			wrapSimpleHandler((id: string) => mcpClient.listTools(id), ConnectorsChannels.listTools)
		);
		ipcMain.handle(
			ConnectorsChannels.callTool,
			wrapSimpleHandler(
				(id, name, args, options) => mcpClient.callTool(id, name, args, options),
				ConnectorsChannels.callTool
			)
		);
		ipcMain.handle(
			ConnectorsChannels.authorizeOAuth,
			wrapSimpleHandler(
				async (input) => {
					const result = await connectors.authorizeOAuth(input);
					await mcpClient.closeConnector(result.connector.id ?? result.connectorId);
					return result;
				},
				ConnectorsChannels.authorizeOAuth
			)
		);

		logger.info('ConnectorsIpc', `Registered ${this.name} module`);
	}
}
