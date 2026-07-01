import { enabled, setCronEnabled } from './cron-module-state';
import { readState } from './cron-read-state';
import { writeState } from './cron-write-state';

export function initCron(): void {
	setCronEnabled(readState().enabled ?? true);
	writeState((state) => {
		state.enabled = enabled;
	});
}
