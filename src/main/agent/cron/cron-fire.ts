import { exists } from './cron-exists';
import { requireSchedule } from './cron-require-schedule';
import { unscheduleJob } from './cron-unschedule-job';
import { trigger } from './cron-trigger';

export function fire(scheduleId: string): void {
	if (!exists(scheduleId)) {
		console.warn(
			'[Cron]',
			`Orphaned cron job removed: schedule ${scheduleId} no longer exists.`
		);
		unscheduleJob(scheduleId);
		return;
	}
	const schedule = requireSchedule(scheduleId);
	if (schedule.action.type === 'debug') {
		console.info('[Cron]', `Schedule ${scheduleId} fired: ${schedule.action.message}`);
	}
	if (schedule.action.type === 'agent') {
	}
	trigger(scheduleId);
}
