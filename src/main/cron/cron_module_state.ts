import type { CronEventListener, CronJobHandle } from './cron_internal_types';

export const tasks = new Map<string, CronJobHandle>();
export const listeners = new Set<CronEventListener>();
export let enabled = true;

export function setCronEnabled(value: boolean): void {
	enabled = value;
}
