import { randomUUID } from 'node:crypto';
import { listeners } from './cron-module-state';
import type { CronSchedule, CronScheduleEventType } from './cron-types';

export function emit(schedule: CronSchedule, type: CronScheduleEventType, message: string): void {
	const event = {
		eventId: randomUUID(),
		scheduleId: schedule.id,
		type,
		timestamp: new Date().toISOString(),
		message,
	};
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (error) {
			console.error('[Cron]', 'Cron event listener failed.', error);
		}
	}
}
