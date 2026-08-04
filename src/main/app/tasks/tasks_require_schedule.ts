import { clone } from './tasks_clone';
import { readState } from './tasks_read_state';
import type { TaskSchedule } from './tasks_types';

export function requireSchedule(scheduleId: string): TaskSchedule {
	const schedule = readState().schedules.find((entry) => entry.id === scheduleId);
	if (!schedule) throw new Error(`Task schedule not found: ${scheduleId}`);
	return clone(schedule);
}
