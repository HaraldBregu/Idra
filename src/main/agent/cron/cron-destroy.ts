import { stopCron } from './cron-stop';

export function destroyCron(): void {
	void stopCron();
	console.info('[Cron]', 'Disposed');
}
