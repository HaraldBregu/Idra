import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { TasksChannels } from '../../shared/ipc/ipc-channels';
import { CronService } from '../cron';

export class TasksIpc implements IpcModule {
	readonly name = 'tasks';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const cron = container.get(CronService);

		registerQuery(TasksChannels.list, () => cron.listSchedules());
		registerQuery(TasksChannels.getRuntime, () => cron.getRuntime());
		registerCommand(TasksChannels.setRuntime, (providerId: string, modelId: string) =>
			cron.setRuntime(providerId, modelId),
		);
	}
}
