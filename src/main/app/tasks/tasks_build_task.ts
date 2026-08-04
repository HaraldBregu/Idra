import { randomUUID } from 'node:crypto';
import type { TaskSchedule, TaskScheduledTask } from './tasks_types';

export function buildTask(schedule: TaskSchedule): TaskScheduledTask {
	const now = new Date().toISOString();
	return {
		id: randomUUID(),
		title: schedule.name,
		description: schedule.description,
		createdAt: now,
		updatedAt: now,
	};
}
