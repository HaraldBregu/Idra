import type { CronSchedule } from '../types';

/** A schedule is active when it is enabled, not paused, and not deleted. */
export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.status === 'active' && schedule.enabled && !schedule.deletedAt;
}
