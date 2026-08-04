import { getCronState } from './tasks_store';
import type { PersistedCronState } from './tasks_types';

export function readState(): PersistedCronState {
	return getCronState();
}
