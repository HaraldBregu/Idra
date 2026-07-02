import { listeners } from './cron_module_state';
import type { CronEvents } from './cron_types';

export const cronEvents: CronEvents = {
	subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};
