import { stopCron } from './tasks_stop';

export function destroyCron(): void {
	void stopCron();
	console.info('[Task]', 'Disposed');
}
