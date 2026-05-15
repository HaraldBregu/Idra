import type { Task, TaskClientApi, TaskCreateRequest, TaskEvent, TaskId, TaskListFilter, TaskSubscription } from '../../../shared/task';

/**
 * Renderer-facing client shape. In production this is implemented by preload
 * over typed IPC; tests can provide the same interface directly.
 */
export class TaskClient implements TaskClientApi {
	constructor(private readonly api: TaskClientApi) {}

	createTask(request: TaskCreateRequest): Promise<Task> {
		return this.api.createTask(request);
	}

	getTask(taskId: TaskId): Promise<Task> {
		return this.api.getTask(taskId);
	}

	listTasks(filter?: TaskListFilter): Promise<Task[]> {
		return this.api.listTasks(filter);
	}

	cancelTask(taskId: TaskId, reason?: string): Promise<void> {
		return this.api.cancelTask(taskId, reason);
	}

	retryTask(taskId: TaskId): Promise<void> {
		return this.api.retryTask(taskId);
	}

	subscribeToTask(taskId: TaskId, listener: (event: TaskEvent) => void): TaskSubscription {
		return this.api.subscribeToTask(taskId, listener);
	}

	subscribeToTaskList(filter: TaskListFilter | undefined, listener: (event: TaskEvent) => void): TaskSubscription {
		return this.api.subscribeToTaskList(filter, listener);
	}
}
