import { requireSchedule } from './cron_require_schedule';
import type { CronSchedule } from './cron_types';

export function getSchedule(scheduleId: string): CronSchedule {
	return requireSchedule(scheduleId);
}
