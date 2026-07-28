import cron from 'node-cron';
import { tasks } from './cron_module_state';

export function unscheduleJob(scheduleId: string): void {
	const task = tasks.get(scheduleId);
	if (task) {
		task.stop();
		tasks.delete(scheduleId);
	}
	for (const cronTask of cron.getTasks().values()) {
		if (cronTask.name === `cron:${scheduleId}`) void cronTask.destroy();
	}
}
