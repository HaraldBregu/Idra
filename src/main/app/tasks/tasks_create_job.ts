import { createCronJob } from './tasks_create_tasks_job';
import type { TaskJobHandle } from './tasks_internal_types';
import type { TaskSchedule } from './tasks_types';

export function createJob(schedule: TaskSchedule): TaskJobHandle | undefined {
	if (schedule.cronExpression) return createCronJob(schedule);
	console.warn('[Task]', `Schedule ${schedule.id} skipped: no cronExpression provided.`);
	return undefined;
}
