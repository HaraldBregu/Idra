import { clone } from './cron_clone';
import { readState } from './cron_read_state';
import type { CronSchedule } from './cron_types';

export function requireSchedule(scheduleId: string): CronSchedule {
	const schedule = readState().schedules.find((entry) => entry.id === scheduleId);
	if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
	return clone(schedule);
}
