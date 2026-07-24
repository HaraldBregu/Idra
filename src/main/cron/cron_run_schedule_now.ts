import { trigger } from './cron_trigger';
import type { CronScheduledTask } from './cron_types';

export function runScheduleNow(scheduleId: string): CronScheduledTask {
	return trigger(scheduleId);
}
