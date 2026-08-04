import { clone } from './cron_clone';
import { readState } from './cron_read_state';
import type { CronSchedule } from './cron_types';

export function list(): CronSchedule[] {
	const schedules = readState().schedules.sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
	);
	return clone(schedules);
}
