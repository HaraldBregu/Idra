import { enabled, setCronEnabled } from './tasks_module_state';
import { readState } from './tasks_read_state';
import { writeState } from './tasks_write_state';

export function initCron(): void {
	setCronEnabled(readState().enabled ?? true);
	writeState((state) => {
		state.enabled = enabled;
	});
}
