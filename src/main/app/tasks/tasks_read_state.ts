import { getTaskState } from './tasks_store';
import type { PersistedTaskState } from './tasks_types';

export function readState(): PersistedTaskState {
	return getTaskState();
}
