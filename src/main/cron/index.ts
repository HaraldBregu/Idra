import { CronService } from './service';
import type { CronServiceOptions } from './types';
import type { CronLogger } from './types';

/**
 * Cron module entrypoint.
 *
 * Startup code calls createCronService(logger), stores the service in the main
 * container, then calls service.start(). The module persists recurring
 * schedules to the cron settings file and runs the ones that are due.
 */
export function createCronService(
	logger: CronLogger,
	options: CronServiceOptions = {}
): CronService {
	return new CronService(logger, options);
}

export { CronService } from './service';
export type { CronServiceOptions, CronServiceActor } from './types';
