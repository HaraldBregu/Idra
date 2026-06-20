import type { CronTaskContext } from '../core';

export function runDebugTask({ schedule, task, logger }: CronTaskContext): void {
	logger.info('CronService', `Debug task fired for schedule ${schedule.id}.`, {
		schedule,
		task,
	});
}
