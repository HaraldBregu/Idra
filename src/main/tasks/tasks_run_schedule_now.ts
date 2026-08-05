import { trigger } from './tasks_trigger';
import type { TaskScheduledTask } from './tasks_types';

export function runScheduleNow(scheduleId: string): TaskScheduledTask {
	return trigger(scheduleId);
}
