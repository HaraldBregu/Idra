import type { Task, TaskId, TaskPriority } from '../core/task.types';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
	low: 0,
	normal: 1,
	high: 2,
	critical: 3,
};

interface QueueEntry {
	taskId: TaskId;
	priority: TaskPriority;
	createdAt: string;
	sequence: number;
}

export class PriorityQueue {
	private readonly entries = new Map<TaskId, QueueEntry>();
	private sequence = 0;

	enqueue(task: Task): void {
		if (this.entries.has(task.id)) return;
		this.entries.set(task.id, {
			taskId: task.id,
			priority: task.priority,
			createdAt: task.createdAt,
			sequence: this.sequence++,
		});
	}

	remove(taskId: TaskId): void {
		this.entries.delete(taskId);
	}

	dequeue(canRun: (taskId: TaskId) => boolean): TaskId | undefined {
		const next = this.sortedEntries().find((entry) => canRun(entry.taskId));
		if (!next) return undefined;
		this.entries.delete(next.taskId);
		return next.taskId;
	}

	peekAll(): TaskId[] {
		return this.sortedEntries().map((entry) => entry.taskId);
	}

	size(): number {
		return this.entries.size;
	}

	private sortedEntries(): QueueEntry[] {
		return [...this.entries.values()].sort((a, b) => {
			const priority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
			if (priority !== 0) return priority;
			const created = Date.parse(a.createdAt) - Date.parse(b.createdAt);
			if (created !== 0) return created;
			return a.sequence - b.sequence;
		});
	}
}
