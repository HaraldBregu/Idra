import type { TaskEvent, TaskEventType, TaskId, TaskListFilter, TaskSubscription } from '../core/task.types';

export interface TaskEventFilter {
	taskId?: TaskId;
	workflowId?: string;
	types?: TaskEventType[];
	taskListFilter?: TaskListFilter;
}

export class TaskEventBus {
	private readonly listeners = new Map<number, { filter: TaskEventFilter; listener: (event: TaskEvent) => void }>();
	private readonly historyByTask = new Map<TaskId, TaskEvent[]>();
	private nextId = 1;

	publish(event: TaskEvent): void {
		if (event.taskId) {
			const history = this.historyByTask.get(event.taskId) ?? [];
			history.push(event);
			this.historyByTask.set(event.taskId, history);
		}

		for (const { filter, listener } of this.listeners.values()) {
			if (!this.matches(filter, event)) continue;
			listener(event);
		}
	}

	subscribe(filter: TaskEventFilter, listener: (event: TaskEvent) => void): TaskSubscription {
		const id = this.nextId++;
		this.listeners.set(id, { filter, listener });
		return () => {
			this.listeners.delete(id);
		};
	}

	replay(taskId: TaskId): TaskEvent[] {
		return [...(this.historyByTask.get(taskId) ?? [])];
	}

	clear(): void {
		this.listeners.clear();
		this.historyByTask.clear();
	}

	private matches(filter: TaskEventFilter, event: TaskEvent): boolean {
		if (filter.taskId && event.taskId !== filter.taskId) return false;
		if (filter.workflowId && event.workflowId !== filter.workflowId) return false;
		if (filter.types && !filter.types.includes(event.type)) return false;
		return true;
	}
}
