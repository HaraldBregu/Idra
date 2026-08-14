import { tasks } from './tasks_module_state';

export async function stopTask(): Promise<void> {
	for (const task of tasks.values()) task.stop();
	tasks.clear();
}
