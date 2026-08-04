import { createSchedule } from './tasks_create_schedule';
import { deleteSchedule } from './tasks_delete_schedule';
import { getSchedule } from './tasks_get_schedule';
import { listSchedules } from './tasks_list_schedules';
import { pauseSchedule } from './tasks_pause_schedule';
import { resumeSchedule } from './tasks_resume_schedule';
import { runScheduleNow } from './tasks_run_schedule_now';
import { updateSchedule } from './tasks_update_schedule';
import type { TaskFunctionId, TaskFunctionInput, TaskFunctionResult } from './tasks_types';

const handlers: {
	[K in TaskFunctionId]: (input: TaskFunctionInput[K]) => TaskFunctionResult[K];
} = {
	create_schedule: (input) => createSchedule(input.request),
	update_schedule: (input) => updateSchedule(input.scheduleId, input.request),
	pause_schedule: (input) => pauseSchedule(input.scheduleId),
	resume_schedule: (input) => resumeSchedule(input.scheduleId),
	delete_schedule: (input) => deleteSchedule(input.scheduleId),
	get_schedule: (input) => getSchedule(input.scheduleId),
	list_schedules: () => listSchedules(),
	run_schedule_now: (input) => runScheduleNow(input.scheduleId),
};

export function invokeCron<K extends TaskFunctionId>(
	id: K,
	input: TaskFunctionInput[K]
): TaskFunctionResult[K] {
	const handler = handlers[id];
	if (!handler) throw new Error(`Unknown tasks function: ${id}`);
	return handler(input);
}
