import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type { McpSettings } from '../../shared/mcp';
import { Connector } from '../mcp';

export class ConnectorsIpc implements IpcModule {
	readonly name = 'connectors';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const connector = container.get(Connector);

		registerQuery(ConnectorsChannels.list, () => connector.list());
		registerQuery(ConnectorsChannels.get, (id: string) => connector.get(id));
		registerCommand(ConnectorsChannels.save, (input: McpSettings) => connector.save(input));
		registerCommand(ConnectorsChannels.delete, (id: string) => connector.delete(id));
	}
}
