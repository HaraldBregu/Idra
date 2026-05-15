import type { IpcModule } from '../../ipc/ipc-module';
import type { EventBus } from '../../core/event-bus';
import type { MainServiceContainer } from '../../service-registry';
import { registerCommand, registerQuery } from '../../ipc/ipc-gateway';
import { TaskChannels } from '../../../shared/ipc-channels';
import type { TaskCreateRequest, TaskListFilter } from '../../../shared/task';
import { TaskValidationError } from '../core/task.errors';

export class TaskIpc implements IpcModule {
	readonly name = 'tasks';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const tasks = container.get('tasks');
		tasks.subscribeToTaskList(undefined, (taskEvent) => {
			eventBus.broadcast(TaskChannels.event, taskEvent);
		});

		registerCommand(TaskChannels.create, async (request: TaskCreateRequest) => {
			this.validateCreateRequest(request);
			return tasks.createTask({ ...request, source: request.source ?? 'ui', autoStart: request.autoStart ?? true });
		});
		registerQuery(TaskChannels.get, (taskId: string) => tasks.getTask(taskId));
		registerQuery(TaskChannels.list, (filter?: TaskListFilter) => tasks.listTasks(filter));
		registerCommand(TaskChannels.cancel, (taskId: string, reason?: string) => tasks.cancelTask(taskId, reason));
		registerCommand(TaskChannels.retry, (taskId: string) => tasks.retryTask(taskId));
	}

	private validateCreateRequest(request: TaskCreateRequest): void {
		if (!request || typeof request !== 'object') throw new TaskValidationError('Task request must be an object.');
		if (typeof request.type !== 'string' || request.type.length === 0) throw new TaskValidationError('Task type is required.');
		if (!['agent', 'skill', 'tool', 'connector', 'cron', 'api', 'ui', 'system', 'migration', 'sync'].includes(request.source)) {
			throw new TaskValidationError('Invalid task source.');
		}
		if (!('input' in request)) throw new TaskValidationError('Task input is required.');
	}
}
