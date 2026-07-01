import { emit } from './cron-emit';
import { unscheduleJob } from './cron-unschedule-job';
import { update } from './cron-update';

export function pauseSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const now = new Date().toISOString();
	const updated = update(scheduleId, {
		enabled: false,
		updatedAt: now,
	});
	emit(updated, 'schedule.paused', 'Schedule paused.');
}
