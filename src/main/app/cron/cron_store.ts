import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { PersistedCronState } from './cron_types';

const CRON_STORE_NAME = 'settings';

const store = new Store<PersistedCronState>({
	name: CRON_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'cron'),
	accessPropertiesByDotNotation: false,
	defaults: { schedules: [] },
});

export const cronStorePath = store.path;

export function getCronState(): PersistedCronState {
	return store.store;
}

export function setCronState(value: PersistedCronState): void {
	store.store = value;
}
