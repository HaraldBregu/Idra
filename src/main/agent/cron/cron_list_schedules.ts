import { list } from './cron_list';
import type { CronSchedule } from './cron_types';

export function listSchedules(): CronSchedule[] {
	return list();
}
