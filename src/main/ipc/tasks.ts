import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { TasksChannels } from '../../shared/ipc/ipc-channels';
import type { CronService } from '../agent/core/cron';

export interface TasksIpcDeps {
	cron: CronService;
}

export class TasksIpc implements IpcModule<TasksIpcDeps> {
	readonly name = 'tasks';

	register({ cron }: TasksIpcDeps, _eventBus: EventBus): void {

		registerQuery(TasksChannels.list, () => cron.listSchedules());
		registerQuery(TasksChannels.getRuntime, () => cron.getRuntime());
		registerCommand(TasksChannels.setRuntime, (providerId: string, modelId: string) =>
			cron.setRuntime(providerId, modelId),
		);
	}
}
