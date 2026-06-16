import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { McpChannels } from '../../shared/ipc/channels/mcp';
import type { McpNamedEntry } from '../../shared/mcp/types';
import { McpClientManager, McpServerStore } from '../mcp';

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const store = container.get(McpServerStore);
		const manager = container.get(McpClientManager);

		registerQuery(McpChannels.listServers, () => store.list());
		registerQuery(McpChannels.status, () => manager.getStatus());
		registerCommand(McpChannels.upsertServer, async ({ name, config }: McpNamedEntry) => {
			store.upsert(name, config);
			await manager.reconnect(name);
		});
		registerCommand(McpChannels.deleteServer, async (name: string) => {
			await manager.disconnectOne(name);
			store.delete(name);
		});
	}
}
