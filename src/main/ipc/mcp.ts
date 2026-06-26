import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerQuery } from './core/gateway';
import { McpChannels } from '../../shared/ipc/ipc-channels';
import { ConnectorStore } from '../mcp/store';

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(_container: MainServiceContainer, _eventBus: EventBus): void {
		const store = new ConnectorStore();

		registerQuery(McpChannels.listServers, () => store.servers());
	}
}
