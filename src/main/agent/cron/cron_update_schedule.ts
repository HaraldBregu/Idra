import { activate } from './cron_activate';
import { emit } from './cron_emit';
import { unscheduleJob } from './cron_unschedule_job';
import { update } from './cron_update';
import type { CronSchedule, CronScheduleUpdateRequest } from './cron_types';

export function updateSchedule(
	scheduleId: string,
	request: CronScheduleUpdateRequest
): CronSchedule {
	const now = new Date().toISOString();
	const patch: Partial<CronSchedule> = { updatedAt: now };
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
