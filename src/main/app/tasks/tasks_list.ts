import { clone } from './tasks_clone';
import { readState } from './tasks_read_state';
import type { TaskSchedule } from './tasks_types';

export function list(): TaskSchedule[] {
	const schedules = readState().schedules.sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
	);
	return clone(schedules);
}
