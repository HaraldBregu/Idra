import { activate } from './cron_activate';
import { emit } from './cron_emit';
import { update } from './cron_update';

export function resumeSchedule(scheduleId: string): void {
	const now = new Date().toISOString();
	const updated = activate(
		update(scheduleId, {
			enabled: true,
			updatedAt: now,
		})
	);
	emit(updated, 'schedule.resumed', 'Schedule resumed.');
}
