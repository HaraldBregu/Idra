import { clone } from './cron-clone';
import { readState } from './cron-read-state';
import type { CronSchedule } from './cron-types';

export function requireSchedule(scheduleId: string): CronSchedule {
	const schedule = readState().schedules.find((entry) => entry.id === scheduleId);
	if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
	return clone(schedule);
}
