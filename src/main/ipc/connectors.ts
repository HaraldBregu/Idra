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
import { Connector } from '../mcp';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const connector = container.get(Connector);

		registerQuery(ConnectorsChannels.list, () => connector.list());
		registerQuery(ConnectorsChannels.get, (id: string) => connector.get(id));
		registerCommand(ConnectorsChannels.save, (input: ConnectorSettingsRecord) =>
			connector.save(input)
		);
		registerCommand(ConnectorsChannels.upsert, (input: ConnectorInput) =>
			connector.upsert(input)
		);
		registerCommand(ConnectorsChannels.delete, (id: string) => connector.delete(id));
		registerCommand(ConnectorsChannels.authorizeOAuth, (input: ConnectorOAuthDefaults) =>
			connector.authorizeOAuth(input)
		);

		registerQuery(ConnectorsChannels.listTools, (id: string) => connector.listTools(id));
		registerCommand(
			ConnectorsChannels.callTool,
			(id: string, name: string, args?: Record<string, unknown>) =>
				connector.callTool(id, name, args)
		);
		registerCommand(ConnectorsChannels.disconnect, (id: string) => connector.disconnect(id));
	}
}
