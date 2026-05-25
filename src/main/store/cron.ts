import type { CronTask } from '../../shared/cron';
import type { CronStoreState } from '../cron/core/cron.types';
import { emptyCronStoreState, migrateCronStoreState } from '../cron/store/cron-store-migrations';
import type { FridayCronStoreState } from '../cron/friday/store';
import { migrateFridayCronStoreState, serializeFridayCronStoreState } from '../cron/friday/store';
import type { CronSettings, SettingsStoreAccessor } from '../../shared/store';

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

export class CronStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getCronTasks(): CronTask[] {
		const tasks = this.getCronSettings().tasks;
		if (Array.isArray(tasks)) return tasks as CronTask[];
		return [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.setCronSettings({ tasks });
	}

	getCronSchedulerState(): CronStoreState {
		const scheduler = this.getCronSettings().scheduler;
		return migrateCronStoreState(scheduler ?? emptyCronStoreState());
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.setCronSettings({ scheduler: migrateCronStoreState(state) });
	}

	getFridayCronState(): FridayCronStoreState {
		return migrateFridayCronStoreState(this.getCronSettings());
	}

	setFridayCronState(state: FridayCronStoreState): void {
		this.store.set('cron', {
			...this.getCronSettings(),
			...serializeFridayCronStoreState(state),
		});
	}

	private getCronSettings(): CronSettings {
		return (readRecord(this.store.get('cron')) ?? {}) as CronSettings;
	}

	private setCronSettings(patch: CronSettings): void {
		this.store.set('cron', {
			...this.getCronSettings(),
			...patch,
		});
	}
}
