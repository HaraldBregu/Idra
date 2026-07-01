import type { CronSchedule } from './cron-types';

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}
