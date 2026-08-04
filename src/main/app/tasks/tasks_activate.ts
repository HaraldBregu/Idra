import { isActiveSchedule } from './tasks_is_active_schedule';
import { scheduleJob } from './tasks_schedule_job';
import type { TaskSchedule } from './tasks_types';

export function activate(schedule: TaskSchedule): TaskSchedule {
	if (!isActiveSchedule(schedule)) return schedule;
	scheduleJob(schedule);
	return schedule;
}
