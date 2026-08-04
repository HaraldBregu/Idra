import type { TaskSchedule } from './tasks_types';

export function isActiveSchedule(schedule: TaskSchedule): boolean {
	return schedule.enabled;
}
