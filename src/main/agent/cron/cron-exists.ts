import { readState } from './cron-read-state';

export function exists(scheduleId: string): boolean {
	return readState().schedules.some((entry) => entry.id === scheduleId);
}
