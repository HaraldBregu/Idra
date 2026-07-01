import { list } from './cron-list';
import type { CronSchedule } from './cron-types';

export function listSchedules(): CronSchedule[] {
	return list();
}
