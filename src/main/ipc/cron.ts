import type { EventBus } from '../app/event_bus';
import { CronChannels } from '../../shared/ipc_channels_definitions';
import { getRuntime, listSchedules, setRuntime } from '../app/cron';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class CronIpc implements IpcModule {
	readonly name = 'cron';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(CronChannels.list, () => listSchedules());
		registerQuery(CronChannels.getRuntime, () => getRuntime());
		registerCommand(CronChannels.setRuntime, (providerId: string, modelId: string) => {
			return setRuntime(providerId, modelId);
		});
	}
}
