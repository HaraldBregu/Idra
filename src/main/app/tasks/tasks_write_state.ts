import { setTaskState } from './tasks_store';
import { readState } from './tasks_read_state';
import type { PersistedTaskState } from './tasks_types';

export function writeState<T>(mutate: (state: PersistedTaskState) => T): T {
	const state = readState();
	const result = mutate(state);
	setTaskState(state);
	return result;
}
