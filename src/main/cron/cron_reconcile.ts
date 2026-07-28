import cron from 'node-cron';
import { isActiveSchedule } from './cron_is_active_schedule';
import { list } from './cron_list';

export function reconcile(): void {
	const active = new Set(list().filter(isActiveSchedule).map((schedule) => `cron:${schedule.id}`));
	for (const task of cron.getTasks().values()) {
		if (task.name?.startsWith('cron:') && !active.has(task.name)) {
			console.warn('[Cron]', `Destroying orphaned cron job ${task.name}.`);
			void task.destroy();
		}
	}
}
