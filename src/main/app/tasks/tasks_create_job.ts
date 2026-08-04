import { createCronJob } from './cron_create_cron_job';
import type { CronJobHandle } from './cron_internal_types';
import type { CronSchedule } from './cron_types';

export function createJob(schedule: CronSchedule): CronJobHandle | undefined {
	if (schedule.cronExpression) return createCronJob(schedule);
	console.warn('[Cron]', `Schedule ${schedule.id} skipped: no cronExpression provided.`);
	return undefined;
}
