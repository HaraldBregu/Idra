import { setCronState } from './cron-store';
import { readState } from './cron-read-state';
import type { PersistedCronState } from './cron-types';

export function writeState<T>(mutate: (state: PersistedCronState) => T): T {
	const state = readState();
	const result = mutate(state);
	setCronState(state);
	return result;
}
