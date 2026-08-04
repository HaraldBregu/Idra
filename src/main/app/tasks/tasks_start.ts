import { enabled } from './tasks_module_state';
import { activate } from './tasks_activate';
import { isActiveSchedule } from './tasks_is_active_schedule';
import { list } from './tasks_list';
import { reconcile } from './tasks_reconcile';

export async function startCron(): Promise<void> {
	if (!enabled) {
		console.warn('[Task]', 'Task automatic execution is globally disabled.');
		return;
	}
	reconcile();
	for (const schedule of list().filter(isActiveSchedule)) {
		activate(schedule);
	}
	console.info('[Task]', 'Task service started.');
}
