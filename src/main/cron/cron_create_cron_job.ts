import cron from 'node-cron';
import { fire } from './cron_fire';
import type { CronJobHandle } from './cron_internal_types';
import type { CronSchedule } from './cron_types';

export function createCronJob(schedule: CronSchedule): CronJobHandle | undefined {
	if (!schedule.cronExpression || !cron.validate(schedule.cronExpression)) {
		console.warn(
			'[Cron]',
			`Schedule ${schedule.id} has an invalid cron expression: ${schedule.cronExpression}`
		);
		return undefined;
	}
	const task = cron.schedule(schedule.cronExpression, () => fire(schedule.id), {
		name: `cron:${schedule.id}`,
	});
	return { stop: () => task.destroy(), getNextRun: () => task.getNextRun() };
}
