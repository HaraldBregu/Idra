import Store from 'electron-store';
import type {
	CronConfigurationStore,
	CronServiceConfiguration,
	CronServiceConfigurationPatch,
} from '../core/config';
import { normalizeCronServiceConfigurationPatch } from '../core/config';
import { CronScheduleStoreError } from '../core/errors';

type CronConfigurationElectronStore = {
	get store(): unknown;
	set store(value: CronServiceConfigurationPatch);
};

export class ElectronStoreCronConfigurationStore implements CronConfigurationStore {
	private readonly store: CronConfigurationElectronStore;

	constructor(store?: CronConfigurationElectronStore) {
		this.store =
			store ??
			new Store<CronServiceConfigurationPatch>({
				name: 'cron-config',
				accessPropertiesByDotNotation: false,
			});
	}

	readConfiguration(): CronServiceConfigurationPatch {
		try {
			return normalizeCronServiceConfigurationPatch(this.store.store);
		} catch (error) {
			throw new CronScheduleStoreError('Failed to read cron configuration.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	writeConfiguration(configuration: CronServiceConfiguration): CronServiceConfiguration {
		try {
			this.store.store = configuration;
			return { ...configuration };
		} catch (error) {
			throw new CronScheduleStoreError('Failed to write cron configuration.', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
