import { listeners } from './cron-module-state';
import type { CronEvents } from './cron-types';

export const cronEvents: CronEvents = {
	subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};
