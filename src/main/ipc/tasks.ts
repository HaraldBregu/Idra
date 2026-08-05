import type { EventBus } from '../app/event_bus';
import { TaskChannels } from '../../shared/ipc_channels_definitions';
import { getRuntime, listSchedules, setRuntime } from '../tasks';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class TaskIpc implements IpcModule {
	readonly name = 'tasks';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(TaskChannels.list, () => listSchedules());
		registerQuery(TaskChannels.getRuntime, () => getRuntime());
		registerCommand(TaskChannels.setRuntime, (providerId: string, modelId: string) => {
			return setRuntime(providerId, modelId);
		});
	}
}
