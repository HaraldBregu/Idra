import type { CronSchedule } from '../types';

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.status === 'active' && schedule.enabled && !schedule.deletedAt;
}
