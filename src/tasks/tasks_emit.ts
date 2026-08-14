import { randomUUID } from 'node:crypto';
import { listeners } from './tasks_module_state';
import type { TaskSchedule, TaskScheduleEvent } from './tasks_types';

export function emit(schedule: TaskSchedule, type: TaskScheduleEvent['type'], message: string): void {
	const event = {
		eventId: randomUUID(),
		scheduleId: schedule.id,
		type,
		timestamp: new Date().toISOString(),
		message,
	};
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (error) {
			console.error('[Task]', 'Task event listener failed.', error);
		}
	}
}
