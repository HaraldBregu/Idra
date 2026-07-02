import { enabled, setCronEnabled } from './cron_module_state';
import { readState } from './cron_read_state';
import { writeState } from './cron_write_state';

export function initCron(): void {
	setCronEnabled(readState().enabled ?? true);
	writeState((state) => {
		state.enabled = enabled;
	});
}
