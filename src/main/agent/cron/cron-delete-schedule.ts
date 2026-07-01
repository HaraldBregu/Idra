import { emit } from './cron-emit';
import { remove } from './cron-remove';
import { unscheduleJob } from './cron-unschedule-job';

export function deleteSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const removed = remove(scheduleId);
	emit(removed, 'schedule.deleted', 'Schedule deleted.');
}
