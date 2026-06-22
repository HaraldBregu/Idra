import type { CronSchedule } from './types';

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}

export const CRON_STORE_DIRECTORY = 'cron';
export const CRON_STORE_FILE_NAME = 'settings';

export function defaultCronEnabled(): boolean {
	return process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false';
}
