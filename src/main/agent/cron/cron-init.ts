import { readState } from './cron-read-state';
import { setCronEnabled, enabled as getCronEnabled } from './cron-module-state';
import { writeState } from './cron-write-state';

export function initCron(): void {
	setCronEnabled(readState().enabled ?? true);
	writeState((state) => {
		state.enabled = getCronEnabled;
	});
}
