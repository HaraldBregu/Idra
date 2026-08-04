import { listeners } from './tasks_module_state';
import type { TaskEvents } from './tasks_types';

export const taskEvents: TaskEvents = {
	subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};
