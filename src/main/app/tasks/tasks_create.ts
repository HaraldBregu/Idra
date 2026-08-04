import { clone } from './tasks_clone';
import { writeState } from './tasks_write_state';
import type { TaskSchedule } from './tasks_types';

export function create(schedule: TaskSchedule): TaskSchedule {
	return writeState((state) => {
		state.schedules.push(clone(schedule));
		return clone(schedule);
	});
}
