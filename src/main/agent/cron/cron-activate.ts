import { isActiveSchedule } from './cron-is-active-schedule';
import { scheduleJob } from './cron-schedule-job';
import type { CronSchedule } from './cron-types';

export function activate(schedule: CronSchedule): CronSchedule {
	if (!isActiveSchedule(schedule)) return schedule;
	scheduleJob(schedule);
	return schedule;
}
