import { list } from './tasks_list';
import type { TaskSchedule } from './tasks_types';

export function listSchedules(): TaskSchedule[] {
	return list();
}
