import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerQuery } from './core/gateway';
import { McpChannels } from '../../shared/ipc/channels/mcp';
import { McpClientManager } from '../agent/mcp';

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const manager = container.get(McpClientManager);

		registerQuery(McpChannels.status, () => manager.getStatus());
	}
}
