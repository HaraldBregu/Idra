const storeConstructor = jest.fn(() => ({ store: {} }));

jest.mock('electron-store', () => ({
	__esModule: true,
	default: storeConstructor,
}));

import { ElectronStoreCronScheduleStore } from '../../../../src/main/cron/adapters/store';

describe('ElectronStoreCronScheduleStore', () => {
	it('stores cron schedules in cron/settings.json', () => {
		new ElectronStoreCronScheduleStore();

		expect(storeConstructor).toHaveBeenCalledWith({
			name: 'settings',
			cwd: 'cron',
			accessPropertiesByDotNotation: false,
		});
	});
});
