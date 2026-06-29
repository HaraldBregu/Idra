import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type { McpSettings } from '../../shared/mcp';
import type { McpService } from '../mcp';

export interface ConnectorsIpcDeps {
	connector: McpService;
}

export class ConnectorsIpc implements IpcModule<ConnectorsIpcDeps> {
	readonly name = 'connectors';

	register({ connector }: ConnectorsIpcDeps, _eventBus: EventBus): void {

		registerQuery(ConnectorsChannels.list, () => connector.list());
		registerQuery(ConnectorsChannels.get, (id: string) => connector.get(id));
		registerCommand(ConnectorsChannels.save, (input: McpSettings) => connector.save(input));
		registerCommand(ConnectorsChannels.delete, (id: string) => connector.delete(id));
		registerCommand(ConnectorsChannels.oauthStart, (id: string) => connector.startOAuth(id));
		registerCommand(ConnectorsChannels.oauthFinish, (id: string, code: string) =>
			connector.finishOAuth(id, code),
		);
	}
}
