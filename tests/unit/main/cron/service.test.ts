const storeConstructor = jest.fn(() => ({ store: { schedules: [] } }));

jest.mock('electron-store', () => ({
	__esModule: true,
	default: storeConstructor,
}));

import { CronService } from '../../../../src/main/cron/service';

describe('CronService', () => {
	beforeEach(() => {
		storeConstructor.mockClear();
	});

	it('persists cron state in cron/settings.json', () => {
		new CronService({ enabled: false });

		expect(storeConstructor).toHaveBeenCalledWith({
			name: 'settings',
			cwd: 'cron',
			accessPropertiesByDotNotation: false,
			defaults: { schedules: [] },
		});
	});

	it('creates and lists schedules through the merged store', () => {
		const service = new CronService(createLogger(), { enabled: false });

		const created = service.createSchedule({
			name: 'Daily summary',
			type: 'oneTime',
			source: 'user',
			runAt: new Date(Date.now() + 60_000).toISOString(),
		});

		expect(created.id).toBeTruthy();
		expect(service.listSchedules()).toEqual([expect.objectContaining({ id: created.id })]);
	});
});
