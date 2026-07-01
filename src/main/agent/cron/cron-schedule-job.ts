import { tasks } from './cron-module-state';
import { createJob } from './cron-create-job';
import { unscheduleJob } from './cron-unschedule-job';
import type { CronSchedule } from './cron-types';

export function scheduleJob(schedule: CronSchedule): void {
	unscheduleJob(schedule.id);
	const handle = createJob(schedule);
	if (handle) tasks.set(schedule.id, handle);
}
