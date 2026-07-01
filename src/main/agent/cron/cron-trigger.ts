import { requireSchedule } from './cron-require-schedule';
import { buildTask } from './cron-build-task';
import { emit } from './cron-emit';
import type { CronScheduledTask } from './cron-types';

export function trigger(scheduleId: string): CronScheduledTask {
	const schedule = requireSchedule(scheduleId);
	const task = buildTask(schedule);
	emit(schedule, 'schedule.triggered', 'Scheduled task created.');
	return task;
}
