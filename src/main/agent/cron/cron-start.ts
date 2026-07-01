import { enabled } from './cron-module-state';
import { activate } from './cron-activate';
import { isActiveSchedule } from './cron-is-active-schedule';
import { list } from './cron-list';
import { reconcile } from './cron-reconcile';

export async function startCron(): Promise<void> {
	if (!enabled) {
		console.warn('[Cron]', 'Cron automatic execution is globally disabled.');
		return;
	}
	reconcile();
	for (const schedule of list().filter(isActiveSchedule)) {
		activate(schedule);
	}
	console.info('[Cron]', 'Cron service started.');
}
