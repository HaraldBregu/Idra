const storeConstructor = jest.fn(() => ({ store: {} }));

jest.mock('electron-store', () => ({
	__esModule: true,
	default: storeConstructor,
}));

import { ElectronStoreCronConfigurationStore } from '../../../../src/main/cron/adapters/config';
import { emptyCronStoreState } from '../../../../src/main/cron/adapters/store';
import type { CronStoreState } from '../../../../src/main/cron/core/types';

describe('ElectronStoreCronConfigurationStore', () => {
	it('stores cron configuration in cron/settings.json', () => {
		new ElectronStoreCronConfigurationStore();

		expect(storeConstructor).toHaveBeenCalledWith({
			name: 'settings',
			cwd: 'cron',
			accessPropertiesByDotNotation: false,
		});
	});

	it('writes configuration without replacing schedule state', () => {
		const state: CronStoreState = {
			...emptyCronStoreState(),
			schedules: [{ id: 'existing-schedule' } as CronStoreState['schedules'][number]],
		};
		const store = { store: state };
		const configuration = new ElectronStoreCronConfigurationStore(store);

		configuration.writeConfiguration({ enabled: false });

		expect(store.store.configuration).toEqual({ enabled: false });
		expect(store.store.schedules).toEqual([{ id: 'existing-schedule' }]);
	});
});
