import { requireSchedule } from './tasks_require_schedule';
import { buildTask } from './tasks_build_task';
import { emit } from './tasks_emit';
import type { TaskScheduledTask } from './tasks_types';

export function trigger(scheduleId: string): TaskScheduledTask {
	const schedule = requireSchedule(scheduleId);
	const task = buildTask(schedule);
	emit(schedule, 'schedule.triggered', 'Scheduled task created.');
	return task;
}
