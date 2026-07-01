import { getCronState } from './cron-store';
import type { PersistedCronState } from './cron-types';

export function readState(): PersistedCronState {
	return getCronState();
}
