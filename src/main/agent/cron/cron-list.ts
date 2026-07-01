import { clone } from './cron-clone';
import { readState } from './cron-read-state';
import type { CronSchedule } from './cron-types';

export function list(): CronSchedule[] {
	const schedules = readState().schedules.sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
	);
	return clone(schedules);
}
