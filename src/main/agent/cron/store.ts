import path from 'node:path';
import ElectronStore from 'electron-store';
import type { PersistedCronState } from './cron';
import type { Config } from '../core/config';

const CRON_STORE_NAME = 'cron';
const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };

export class CronStore {
	private readonly cron: ElectronStore<PersistedCronState>;

	constructor(private readonly config: Config) {
		this.cron = new ElectronStore<PersistedCronState>({
			name: CRON_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_CRON_STATE,
		});
	}

	getState(): PersistedCronState {
		return this.cron.store;
	}

	setState(value: PersistedCronState): void {
		this.cron.store = value;
	}
}
