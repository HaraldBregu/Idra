import { activate } from './tasks_activate';
import { emit } from './tasks_emit';
import { update } from './tasks_update';

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
