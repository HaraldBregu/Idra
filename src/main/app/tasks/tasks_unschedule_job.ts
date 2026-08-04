import cron from 'node-cron';
import { tasks } from './tasks_module_state';

export function unscheduleJob(scheduleId: string): void {
	const task = tasks.get(scheduleId);
	if (task) {
		task.stop();
		tasks.delete(scheduleId);
	}
	for (const cronTask of tasks.getTasks().values()) {
		if (cronTask.name === `tasks:${scheduleId}`) void cronTask.destroy();
	}
}
