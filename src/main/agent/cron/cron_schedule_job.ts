import { tasks } from './cron_module_state';
import { createJob } from './cron_create_job';
import { unscheduleJob } from './cron_unschedule_job';
import type { CronSchedule } from './cron_types';

export function scheduleJob(schedule: CronSchedule): void {
	unscheduleJob(schedule.id);
	const handle = createJob(schedule);
	if (handle) tasks.set(schedule.id, handle);
}
