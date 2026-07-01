import { trigger } from './cron-trigger';
import type { CronScheduledTask } from './cron-types';

export function runScheduleNow(scheduleId: string): CronScheduledTask {
	return trigger(scheduleId);
}
