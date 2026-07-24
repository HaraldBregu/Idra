import { createSchedule } from './cron_create_schedule';
import { deleteSchedule } from './cron_delete_schedule';
import { getSchedule } from './cron_get_schedule';
import { listSchedules } from './cron_list_schedules';
import { pauseSchedule } from './cron_pause_schedule';
import { resumeSchedule } from './cron_resume_schedule';
import { runScheduleNow } from './cron_run_schedule_now';
import { updateSchedule } from './cron_update_schedule';
import type { CronFunctionId, CronFunctionInput, CronFunctionResult } from './cron_types';

const handlers: {
	[K in CronFunctionId]: (input: CronFunctionInput[K]) => CronFunctionResult[K];
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

export function invokeCron<K extends CronFunctionId>(
	id: K,
	input: CronFunctionInput[K]
): CronFunctionResult[K] {
	const handler = handlers[id];
	if (!handler) throw new Error(`Unknown cron function: ${id}`);
	return handler(input);
}
