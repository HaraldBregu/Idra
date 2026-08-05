import { clone } from './tasks_clone';
import { writeState } from './tasks_write_state';
import type { TaskSchedule } from './tasks_types';

export function remove(scheduleId: string): TaskSchedule {
	return writeState((state) => {
		const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
		if (index === -1) throw new Error(`Task schedule not found: ${scheduleId}`);
		const [removed] = state.schedules.splice(index, 1);
		return clone(removed!);
	});
}
