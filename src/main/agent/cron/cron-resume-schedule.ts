import { activate } from './cron-activate';
import { emit } from './cron-emit';
import { update } from './cron-update';

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
