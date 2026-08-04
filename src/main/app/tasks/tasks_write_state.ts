import { setCronState } from './tasks_store';
import { readState } from './tasks_read_state';
import type { PersistedCronState } from './tasks_types';

export function writeState<T>(mutate: (state: PersistedCronState) => T): T {
	const state = readState();
	const result = mutate(state);
	setCronState(state);
	return result;
}
