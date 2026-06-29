import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { HeartbeatChannels } from '../../shared/ipc/ipc-channels';
import type { HeartbeatService } from '../heartbeat';
import type { HeartbeatSettings } from '../heartbeat';

export interface HeartbeatIpcDeps {
	heartbeat: HeartbeatService;
}

export class HeartbeatIpc implements IpcModule<HeartbeatIpcDeps> {
	readonly name = 'heartbeat';

	register({ heartbeat }: HeartbeatIpcDeps, _eventBus: EventBus): void {
		registerQuery(HeartbeatChannels.settings, () => heartbeat.getSettings());
		registerCommand(HeartbeatChannels.saveSettings, (request) =>
			heartbeat.updateSettings((request ?? {}) as Partial<HeartbeatSettings>)
		);
	}
}
