import { createSchedule } from './cron-create-schedule';
import { deleteSchedule } from './cron-delete-schedule';
import { getSchedule } from './cron-get-schedule';
import { listSchedules } from './cron-list-schedules';
import { pauseSchedule } from './cron-pause-schedule';
import { resumeSchedule } from './cron-resume-schedule';
import { runScheduleNow } from './cron-run-schedule-now';
import { updateSchedule } from './cron-update-schedule';
import type { CronFunctionId, CronFunctionInput, CronFunctionResult } from './cron-types';

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
