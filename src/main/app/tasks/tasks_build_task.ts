import { randomUUID } from 'node:crypto';
import type { CronSchedule, CronScheduledTask } from './cron_types';

export function buildTask(schedule: CronSchedule): CronScheduledTask {
	const now = new Date().toISOString();
	return {
		id: randomUUID(),
		title: schedule.name,
		description: schedule.description,
		createdAt: now,
		updatedAt: now,
	};
}
