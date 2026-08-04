import { stopTask } from './tasks_stop';

export function destroyTask(): void {
	void stopTask();
	console.info('[Task]', 'Disposed');
}
