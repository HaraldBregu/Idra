import type { CronSchedule } from './cron_types';

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}
