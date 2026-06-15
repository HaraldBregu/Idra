import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { McpChannels } from '../../shared/ipc/channels/mcp';
import type { McpServerConfig } from '../../shared/mcp/types';
import { McpClientManager, McpServerStore } from '../mcp';

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const store = container.get(McpServerStore);
		const manager = container.get(McpClientManager);

		registerQuery(McpChannels.listServers, () => store.list());
		registerQuery(McpChannels.status, () => manager.getStatus());
		registerCommand(McpChannels.upsertServer, async (config: McpServerConfig) => {
			store.upsert(config);
			await manager.reconnect(config.id);
			return store.get(config.id)!;
		});
		registerCommand(McpChannels.deleteServer, async (id: string) => {
			await manager.reconnect(id);
			store.delete(id);
		});
	}
}
