import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { HeartbeatChannels } from '../../shared/ipc/ipc-channels';
import { HeartbeatService } from '../heartbeat';
import type { HeartbeatSettings } from '../heartbeat';

export class HeartbeatIpc implements IpcModule {
	readonly name = 'heartbeat';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const heartbeat = container.get(HeartbeatService);
		registerQuery(HeartbeatChannels.settings, () => heartbeat.getSettings());
		registerCommand(HeartbeatChannels.saveSettings, (request) =>
			heartbeat.updateSettings((request ?? {}) as Partial<HeartbeatSettings>)
		);
	}
}
