import type { CronSchedule } from './types';

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}

import type { CronRetryPolicy } from './types';

export const CRON_STORE_DIRECTORY = 'cron';
export const CRON_STORE_FILE_NAME = 'settings';

export const DEFAULT_TIMEZONE = 'UTC';

export const DEFAULT_CRON_RETRY_POLICY: CronRetryPolicy = {
	maxAttempts: 1,
	initialDelayMs: 500,
	maxDelayMs: 15_000,
	backoffMultiplier: 2,
	jitter: true,
	retryableErrorCodes: [],
	nonRetryableErrorCodes: [],
};

export function defaultCronEnabled(): boolean {
	return process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false';
}
