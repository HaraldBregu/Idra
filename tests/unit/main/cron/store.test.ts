jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			delete: (key: string) => {
				data.delete(key);
			},
		};
	});
});

import Store from 'electron-store';
import type { CronStoreState } from '../../../../src/main/cron/core/cron.types';
import { ElectronStoreCronStore } from '../../../../src/main/cron/store/electron-store-cron-store';
import { emptyCronStoreState } from '../../../../src/main/cron/store/cron-store-migrations';
import type { CronTask } from '../../../../src/shared/cron';

const MockStore = Store as jest.MockedClass<typeof Store>;

function backingStore(service: ElectronStoreCronStore): {
	get: (key: string) => unknown;
	set: (key: string, value: unknown) => void;
} {
	return (
		service as unknown as {
			store: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
		}
	).store;
}

describe('ElectronStoreCronStore', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	it('uses cron.json for cron persistence', () => {
		new ElectronStoreCronStore();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'cron',
			accessPropertiesByDotNotation: false,
		});
	});

	it('persists cron tasks and scheduler state without sharing settings storage', () => {
		const service = new ElectronStoreCronStore();
		const store = backingStore(service);
		const task = {
			id: 'task-1',
			name: 'task-1',
			schedule: '* * * * *',
			expression: '* * * * *',
			timezone: 'UTC',
			enabled: true,
			status: 'active',
			target: 'job',
			payload: { type: 'message', message: 'Run' },
			data: { type: 'message', message: 'Run' },
			createdAt: '2026-05-22T00:00:00.000Z',
			updatedAt: '2026-05-22T00:00:00.000Z',
			runCount: 0,
			failureCount: 0,
		} satisfies CronTask;
		const scheduler = {
			...emptyCronStoreState(),
			schedules: [{ id: 'schedule-1' }],
		} as unknown as CronStoreState;

		service.setCronTasks([task]);
		service.setCronSchedulerState(scheduler);

		expect(service.getCronTasks()).toEqual([task]);
		expect(service.getCronSchedulerState()).toMatchObject({
			schedules: [{ id: 'schedule-1' }],
		});
		expect(service.getFridayCronState()).toMatchObject({
			jobs: [{ id: 'job-1' }],
			lastRuns: { 'job-1': { runId: 'run-1' } },
		});
		expect(store.get('tasks')).toEqual([task]);
		expect(store.get('scheduler')).toMatchObject({ schedules: [{ id: 'schedule-1' }] });
	});
});
