import path from 'node:path';
import ElectronStore from 'electron-store';
import type { PersistedCronState } from '../core/cron';
import type { Config } from '../core/config';

const CRON_STORE_NAME = 'cron';

export type CronStore = ElectronStore<PersistedCronState>;

export function createCronStore(config: Config, defaults: PersistedCronState): CronStore {
	return new ElectronStore<PersistedCronState>({
		name: CRON_STORE_NAME,
		cwd: path.resolve(config.location),
		accessPropertiesByDotNotation: false,
		defaults,
	});
}

export function getCronState(store: CronStore): PersistedCronState {
	return store.store;
}

export function setCronState(store: CronStore, value: PersistedCronState): void {
	store.store = value;
}
