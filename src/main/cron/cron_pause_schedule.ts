import { emit } from './cron_emit';
import { unscheduleJob } from './cron_unschedule_job';
import { update } from './cron_update';

export function pauseSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const now = new Date().toISOString();
	const updated = update(scheduleId, {
		enabled: false,
		updatedAt: now,
	});
	emit(updated, 'schedule.paused', 'Schedule paused.');
}
