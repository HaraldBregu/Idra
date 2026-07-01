import { createCronJob } from './cron-create-cron-job';
import type { CronJobHandle } from './cron-internal-types';
import type { CronSchedule } from './cron-types';

export function createJob(schedule: CronSchedule): CronJobHandle | undefined {
	if (schedule.cronExpression) return createCronJob(schedule);
	console.warn('[Cron]', `Schedule ${schedule.id} skipped: no cronExpression provided.`);
	return undefined;
}
