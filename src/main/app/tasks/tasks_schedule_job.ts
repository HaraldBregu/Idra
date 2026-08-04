import { tasks } from './tasks_module_state';
import { createJob } from './tasks_create_job';
import { unscheduleJob } from './tasks_unschedule_job';
import type { TaskSchedule } from './tasks_types';

export function scheduleJob(schedule: TaskSchedule): void {
	unscheduleJob(schedule.id);
	const handle = createJob(schedule);
	if (handle) tasks.set(schedule.id, handle);
}
