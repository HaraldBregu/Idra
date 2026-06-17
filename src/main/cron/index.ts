import { CronService } from './service';
import type { CronLogger, CronServiceOptions } from './types';

export function createCronService(
	logger: CronLogger,
	options: CronServiceOptions = {}
): CronService {
	return new CronService(logger, options);
}

export { CronService } from './service';
export type { CronServiceOptions, CronServiceActor } from './types';
