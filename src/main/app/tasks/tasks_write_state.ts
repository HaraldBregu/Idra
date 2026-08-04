import { setCronState } from './cron_store';
import { readState } from './cron_read_state';
import type { PersistedCronState } from './cron_types';

export function writeState<T>(mutate: (state: PersistedCronState) => T): T {
	const state = readState();
	const result = mutate(state);
	setCronState(state);
	return result;
}
