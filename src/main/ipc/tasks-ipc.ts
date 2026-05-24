import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { parseTaskRunRequest } from '../tasks';
import { wrapSimpleHandler } from './ipc-error-handler';
import { TaskChannels } from '../../shared/ipc-channels';
import { TASK_EVENT_TYPES, type TaskEvent, type TaskRecord } from '../../shared/tasks';

export class TasksIpc implements IpcModule {
	readonly name = 'tasks';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const taskManager = container.get('taskManager');

		ipcMain.handle(
			TaskChannels.start,
			wrapSimpleHandler((request: unknown): TaskRecord => {
				return taskManager.startUserTask(parseTaskRunRequest(request));
			}, TaskChannels.start)
		);

		ipcMain.handle(
			TaskChannels.list,
			wrapSimpleHandler((): TaskRecord[] => taskManager.list(), TaskChannels.list)
		);

		ipcMain.handle(
			TaskChannels.get,
			wrapSimpleHandler((id: string): TaskRecord | undefined => {
				if (typeof id !== 'string' || !id.trim()) throw new Error('Task id is required.');
				return taskManager.get(id);
			}, TaskChannels.get)
		);

		ipcMain.handle(
			TaskChannels.cancel,
			wrapSimpleHandler((id: string): TaskRecord => {
				if (typeof id !== 'string' || !id.trim()) throw new Error('Task id is required.');
				return taskManager.cancel(id);
			}, TaskChannels.cancel)
		);

		for (const eventType of TASK_EVENT_TYPES) {
			eventBus.on(eventType, (event) => {
				eventBus.broadcast(TaskChannels.event, event.payload as TaskEvent);
			});
		}
	}
}
