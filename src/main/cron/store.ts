import Store from 'electron-store';
import type { PersistedCronState } from './types';
import { CronStore } from './core';
import { CRON_STORE_DIRECTORY, CRON_STORE_FILE_NAME } from './constants';

export class ElectronCronStore extends CronStore {
	private readonly store: Store<PersistedCronState>;

	constructor() {
		super();
		this.store = new Store<PersistedCronState>({
			name: CRON_STORE_FILE_NAME,
			cwd: CRON_STORE_DIRECTORY,
			accessPropertiesByDotNotation: false,
			defaults: { schedules: [] },
		});
	}

	protected readState(): PersistedCronState {
		return this.store.store;
	}

	protected writeState<T>(mutate: (state: PersistedCronState) => T): T {
		const state = this.readState();
		const result = mutate(state);
		this.store.store = state;
		return result;
	}
}
