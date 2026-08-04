import { enabled } from './cron_module_state';
import { activate } from './cron_activate';
import { isActiveSchedule } from './cron_is_active_schedule';
import { list } from './cron_list';
import { reconcile } from './cron_reconcile';

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
