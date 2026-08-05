import { clone } from './tasks_clone';
import { writeState } from './tasks_write_state';
import type { TaskSchedule } from './tasks_types';

export function update(scheduleId: string, patch: Partial<TaskSchedule>): TaskSchedule {
	return writeState((state) => {
		const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
		if (index === -1) throw new Error(`Task schedule not found: ${scheduleId}`);
		const current = state.schedules[index]!;
		const next: TaskSchedule = {
			...current,
			...clone(patch),
			id: current.id,
		};
		state.schedules[index] = next;
		return clone(next);
	});
}
