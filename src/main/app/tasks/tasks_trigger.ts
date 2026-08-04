import { requireSchedule } from './cron_require_schedule';
import { buildTask } from './cron_build_task';
import { emit } from './cron_emit';
import type { CronScheduledTask } from './cron_types';

export function trigger(scheduleId: string): CronScheduledTask {
	const schedule = requireSchedule(scheduleId);
	const task = buildTask(schedule);
	emit(schedule, 'schedule.triggered', 'Scheduled task created.');
	return task;
}
