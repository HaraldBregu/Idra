import { CronService, type CronServiceOptions } from './service';
import type { CronLogger } from './core/logger';

export function createCronService(
	logger: CronLogger,
	options: CronServiceOptions = {}
): CronService {
	return new CronService(logger, options);
}

export { CronService } from './service';
export type { CronServiceOptions, CronServiceActor } from './service';
export type { CronJobOptions, CronTaskHandler, RegisteredJob } from './types';
export * from './constants';
export type * from './core/types';
export * from './core/errors';
export * from './core/validation';
export * from './core/describer';
export * from './adapters/store';
export * from './adapters/config';
export * from './adapters/runner';
export * from './adapters/registry';
export * from './engine/calculator';
export * from './engine/scheduler';
export * from './engine/support';
export * from './core/config';
export * from './core/events';
export * from './core/logger';
export * from './core/recording';
export * from './core/trigger';
export type { CronScheduleAccessPolicy } from './core/types';
export type * from './client';
