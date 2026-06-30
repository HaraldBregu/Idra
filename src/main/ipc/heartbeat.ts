import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { HeartbeatChannels } from '../../shared/ipc/ipc-channels';
import type { HealthService } from '../agent/health/service';
import type { HeartbeatSettings } from '../agent/health/types';

export interface HeartbeatIpcDeps {
	health: HealthService;
}

export class HeartbeatIpc implements IpcModule<HeartbeatIpcDeps> {
	readonly name = 'heartbeat';

	register({ health }: HeartbeatIpcDeps, _eventBus: EventBus): void {
		registerQuery(HeartbeatChannels.settings, () => health.getSettings());
		registerCommand(HeartbeatChannels.saveSettings, (request) =>
			health.updateSettings((request ?? {}) as Partial<HeartbeatSettings>)
		);
	}
}
