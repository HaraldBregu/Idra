import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerQuery } from './core/gateway';
import { McpChannels } from '../../shared/ipc/ipc-channels';
import { Connector } from '../mcp';

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const connector = container.get(Connector);

		registerQuery(McpChannels.listServers, () => connector.listServers());
	}
}
