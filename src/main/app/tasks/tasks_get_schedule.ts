import { requireSchedule } from './tasks_require_schedule';
import type { TaskSchedule } from './tasks_types';

export function getSchedule(scheduleId: string): TaskSchedule {
	return requireSchedule(scheduleId);
}
