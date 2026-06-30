import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ConnectorsChannels } from '../../shared/ipc/ipc-channels';
import type { McpSettings } from '../../shared/mcp';
import type { McpService } from '../agent/mcp/service';

export interface ConnectorsIpcDeps {
	mcp: McpService;
}

export class ConnectorsIpc implements IpcModule<ConnectorsIpcDeps> {
	readonly name = 'connectors';

	register({ mcp }: ConnectorsIpcDeps, _eventBus: EventBus): void {

		registerQuery(ConnectorsChannels.list, () => mcp.list());
		registerQuery(ConnectorsChannels.get, (id: string) => mcp.get(id));
		registerCommand(ConnectorsChannels.save, (input: McpSettings) => mcp.save(input));
		registerCommand(ConnectorsChannels.delete, (id: string) => mcp.delete(id));
		registerCommand(ConnectorsChannels.oauthStart, (id: string) => mcp.startOAuth(id));
		registerCommand(ConnectorsChannels.oauthFinish, (id: string, code: string) =>
			mcp.finishOAuth(id, code),
		);
	}
}
