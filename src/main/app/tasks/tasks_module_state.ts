import type { CronEventListener, CronJobHandle } from './cron_internal_types';
import type { CronRunner } from './cron_types';

export const tasks = new Map<string, CronJobHandle>();
export const listeners = new Set<CronEventListener>();
export let enabled = true;
export let runner: CronRunner | undefined;

export function setCronEnabled(value: boolean): void {
	enabled = value;
}

export function setCronRunner(value: CronRunner | undefined): void {
	runner = value;
}
