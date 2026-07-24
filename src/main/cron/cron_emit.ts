import { randomUUID } from 'node:crypto';
import { listeners } from './cron_module_state';
import type { CronSchedule, CronScheduleEvent } from './cron_types';

export function emit(schedule: CronSchedule, type: CronScheduleEvent['type'], message: string): void {
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
