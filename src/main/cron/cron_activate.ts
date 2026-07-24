import { isActiveSchedule } from './cron_is_active_schedule';
import { scheduleJob } from './cron_schedule_job';
import type { CronSchedule } from './cron_types';

export function activate(schedule: CronSchedule): CronSchedule {
	if (!isActiveSchedule(schedule)) return schedule;
	scheduleJob(schedule);
	return schedule;
}
