import { exists } from './cron_exists';
import { emit } from './cron_emit';
import { requireSchedule } from './cron_require_schedule';
import { runner } from './cron_module_state';
import { unscheduleJob } from './cron_unschedule_job';
import { trigger } from './cron_trigger';

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
		if (!runner) {
			console.warn('[Cron]', `Schedule ${scheduleId} skipped: no agent runner registered.`);
			emit(schedule, 'schedule.skipped', 'No agent runner registered.');
		} else {
			runner(schedule).then(
				() => emit(schedule, 'schedule.completed', 'Scheduled agent run completed.'),
				(error) => {
					console.error('[Cron]', `Schedule ${scheduleId} agent run failed.`, error);
					emit(
						schedule,
						'schedule.failed',
						error instanceof Error ? error.message : 'Scheduled agent run failed.'
					);
				}
			);
		}
	}
	trigger(scheduleId);
}
