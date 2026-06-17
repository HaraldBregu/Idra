import type { CronRetryPolicy } from './types';

export const CRON_STORE_SCHEMA_VERSION = 1;
export const CRON_STORE_DIRECTORY = 'cron';
export const CRON_STORE_FILE_NAME = 'settings';

export const CRON_MINUTE_MS = 60_000;
export const MAX_CRON_SCAN_MINUTES = 366 * 24 * 60;

export const POLL_INTERVAL_MS = 30_000;
export const DEFAULT_TIMEZONE = 'UTC';

/** Minute, hour, day-of-month, month, day-of-week field ranges. */
export const CRON_FIELD_RANGES: readonly [min: number, max: number][] = [
	[0, 59],
	[0, 23],
	[1, 31],
	[1, 12],
	[0, 7],
];

/**
 * Retained only to populate the required `retryPolicy` field on stored
 * schedules; the simplified scheduler does not retry.
 */
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
