import { emit } from './cron_emit';
import { remove } from './cron_remove';
import { unscheduleJob } from './cron_unschedule_job';

export function deleteSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const removed = remove(scheduleId);
	emit(removed, 'schedule.deleted', 'Schedule deleted.');
}
