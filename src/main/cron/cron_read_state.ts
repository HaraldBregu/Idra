import { getCronState } from './cron_store';
import type { PersistedCronState } from './cron_types';

export function readState(): PersistedCronState {
	return getCronState();
}
