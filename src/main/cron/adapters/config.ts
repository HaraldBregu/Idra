import Store from 'electron-store';
import type {
	CronConfigurationStore,
	CronServiceConfiguration,
	CronServiceConfigurationPatch,
} from '../core/config';
import { normalizeCronServiceConfigurationPatch } from '../core/config';
import { CronScheduleStoreError } from '../core/errors';
import type { CronStoreState } from '../core/types';
import {
	CRON_STORE_DIRECTORY,
	CRON_STORE_FILE_NAME,
} from '../constants';
import { migrateCronStoreState } from './store';

type CronConfigurationElectronStore = {
	get store(): unknown;
	set store(value: CronStoreState);
};

export class ElectronStoreCronConfigurationStore implements CronConfigurationStore {
	private readonly store: CronConfigurationElectronStore;

	constructor(store?: CronConfigurationElectronStore) {
		this.store =
			store ??
			new Store<CronStoreState>({
				name: CRON_STORE_FILE_NAME,
				cwd: CRON_STORE_DIRECTORY,
				accessPropertiesByDotNotation: false,
			});
	}

	readConfiguration(): CronServiceConfigurationPatch {
		try {
			return normalizeCronServiceConfigurationPatch(
				migrateCronStoreState(this.store.store).configuration
			);
		} catch (error) {
			throw new CronScheduleStoreError('Failed to read cron configuration.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	writeConfiguration(configuration: CronServiceConfiguration): CronServiceConfiguration {
		try {
			const state = migrateCronStoreState(this.store.store);
			this.store.store = {
				...state,
				configuration: normalizeCronServiceConfigurationPatch(configuration),
			};
			return { ...configuration };
		} catch (error) {
			throw new CronScheduleStoreError('Failed to write cron configuration.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
