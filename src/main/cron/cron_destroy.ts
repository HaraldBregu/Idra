import { stopCron } from './cron_stop';

export function destroyCron(): void {
	void stopCron();
	console.info('[Cron]', 'Disposed');
}
