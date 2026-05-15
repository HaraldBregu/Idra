import type { TaskManagerService } from '../manager/task-manager';

export async function createAsyncImportFromApi(tasks: TaskManagerService, body: unknown): Promise<{ taskId: string }> {
	const task = await tasks.createTask({
		type: 'api.import',
		title: 'API import',
		source: 'api',
		input: { body },
		priority: 'high',
		autoStart: true,
	});
	return { taskId: task.id };
}
