import { randomUUID } from 'node:crypto';
import { activate } from './cron-activate';
import { create } from './cron-create';
import { emit } from './cron-emit';
import type { CronSchedule, CronScheduleCreateRequest } from './cron-types';

export function createSchedule(request: CronScheduleCreateRequest): CronSchedule {
	const now = new Date();
	const nowIso = now.toISOString();
	const schedule: CronSchedule = {
		id: randomUUID(),
		name: request.name.trim(),
		description: request.description?.trim(),
		cronExpression: request.cronExpression?.trim().replace(/\s+/g, ' '),
		enabled: request.enabled ?? true,
		action: request.action,
		createdAt: nowIso,
		updatedAt: nowIso,
	};
	const created = activate(create(schedule));
	emit(created, 'schedule.created', 'Schedule created.');
	return created;
}
