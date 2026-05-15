import type { TaskManagerService } from '../manager/task-manager';

export async function scheduleCronMaintenanceExample(tasks: TaskManagerService): Promise<string> {
	const task = await tasks.scheduleTask({
		type: 'cron.maintenance',
		title: 'Daily task cleanup',
		source: 'cron',
		input: { cleanup: 'old task events' },
		schedulePolicy: {
			cronExpression: '@daily',
			repeat: true,
			skipIfRunning: true,
			catchUpMissedRuns: false,
		},
	});
	return task.id;
}
