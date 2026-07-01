import { requireSchedule } from './cron-require-schedule';
import type { CronSchedule } from './cron-types';

export function getSchedule(scheduleId: string): CronSchedule {
	return requireSchedule(scheduleId);
}
