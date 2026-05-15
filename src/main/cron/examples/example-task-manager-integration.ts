import { TaskManagerCronScheduleRunner } from '../scheduler/cron-runner';
import type { CronTaskManagerPort } from '../core/cron.types';

export function createCronRunnerForTaskManager(taskManager: CronTaskManagerPort): TaskManagerCronScheduleRunner {
	return new TaskManagerCronScheduleRunner(taskManager);
}
