import { readState } from './cron_read_state';

export function exists(scheduleId: string): boolean {
	return readState().schedules.some((entry) => entry.id === scheduleId);
}
