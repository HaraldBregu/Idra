import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type { ConnectorInput, ConnectorSettingsRecord } from '../../shared/connector';
import { ConnectorService } from '../services/connector-service';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const connectorService = container.get(ConnectorService);

		registerQuery(ConnectorsChannels.list, () => connectorService.list());
		registerQuery(ConnectorsChannels.get, (id: string) => connectorService.get(id));
		registerCommand(ConnectorsChannels.save, (input: ConnectorSettingsRecord) =>
			connectorService.save(input)
		);
		registerCommand(ConnectorsChannels.upsert, (input: ConnectorInput) =>
			connectorService.upsert(input)
		);
	}
}
