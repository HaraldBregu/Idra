import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './core/error-handler';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type { ConnectorRecord } from '../../shared/connectors';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const connectors = container.get('connectors');

		ipcMain.handle(
			ConnectorsChannels.list,
			wrapSimpleHandler(() => redactConnectorSecrets(connectors.list()), ConnectorsChannels.list)
		);
		ipcMain.handle(
			ConnectorsChannels.get,
			wrapSimpleHandler((id: string) => redactConnectorSecrets(connectors.get(id)), ConnectorsChannels.get)
		);
		ipcMain.handle(
			ConnectorsChannels.save,
			wrapSimpleHandler((input) => redactConnectorSecrets(connectors.save(input)), ConnectorsChannels.save)
		);
		ipcMain.handle(
			ConnectorsChannels.upsert,
			wrapSimpleHandler((input) => redactConnectorSecrets(connectors.upsert(input)), ConnectorsChannels.upsert)
		);

		logger.info('ConnectorsIpc', `Registered ${this.name} module`);
	}
}

function redactConnectorSecrets(connectors: ConnectorRecord): ConnectorRecord {
	return Object.fromEntries(
		Object.entries(connectors).map(([key, connector]) => [
			key,
			{
				...connector,
				authorization: connector.authorization ? '' : undefined,
			},
		])
	);
}
