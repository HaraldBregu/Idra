import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type {
	ConnectorInput,
	ConnectorOAuthDefaults,
	ConnectorSettingsRecord,
} from '../../shared/connector';
import { ConnectorSettingsService } from '../services/connector-settings-service';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const connectorSettingsService = container.get(ConnectorSettingsService);

		registerQuery(ConnectorsChannels.list, () => connectorSettingsService.list());
		registerQuery(ConnectorsChannels.get, (id: string) => connectorSettingsService.get(id));
		registerCommand(ConnectorsChannels.save, (input: ConnectorSettingsRecord) =>
			connectorSettingsService.save(input)
		);
		registerCommand(ConnectorsChannels.upsert, (input: ConnectorInput) =>
			connectorSettingsService.upsert(input)
		);
		registerCommand(ConnectorsChannels.authorizeOAuth, (input: ConnectorOAuthDefaults) =>
			connectorSettingsService.authorizeOAuth(input)
		);
	}
}
