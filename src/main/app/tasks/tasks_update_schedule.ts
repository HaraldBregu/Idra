import { activate } from './tasks_activate';
import { emit } from './tasks_emit';
import { unscheduleJob } from './tasks_unschedule_job';
import { update } from './tasks_update';
import type { TaskSchedule, TaskScheduleUpdateRequest } from './tasks_types';

export function updateSchedule(
	scheduleId: string,
	request: TaskScheduleUpdateRequest
): TaskSchedule {
	const now = new Date().toISOString();
	const patch: Partial<TaskSchedule> = { updatedAt: now };
	if (typeof request.name === 'string') patch.name = request.name.trim();
	if (typeof request.description === 'string') patch.description = request.description.trim();
	if (typeof request.cronExpression === 'string') {
		patch.cronExpression = request.cronExpression.trim().replace(/\s+/g, ' ');
	}
	if (typeof request.enabled === 'boolean') patch.enabled = request.enabled;
	if (request.action) patch.action = request.action;
	unscheduleJob(scheduleId);
	const updated = activate(update(scheduleId, patch));
	emit(updated, 'schedule.updated', 'Schedule updated.');
	return updated;
}
