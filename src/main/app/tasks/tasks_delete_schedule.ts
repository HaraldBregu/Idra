import { emit } from './tasks_emit';
import { remove } from './tasks_remove';
import { unscheduleJob } from './tasks_unschedule_job';

export function deleteSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const removed = remove(scheduleId);
	emit(removed, 'schedule.deleted', 'Schedule deleted.');
}
