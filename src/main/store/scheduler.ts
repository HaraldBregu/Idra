import type { CronTask } from '../../shared/cron';
import type { CronStoreState } from '../cron/core/cron.types';
import { emptyCronStoreState, migrateCronStoreState } from '../cron/store/cron-store-migrations';
import type { FridayCronStoreState } from '../cron/friday/store';
import {
	emptyFridayCronStoreState,
	migrateFridayCronStoreState,
	serializeFridayCronStoreState,
} from '../cron/friday/store';
import type { SettingsStoreAccessor, TaskSchedulerSettings } from './types';

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

export class SchedulerStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getCronTasks(): CronTask[] {
		const legacyTasks = this.getTaskSchedulerSettings().legacyTasks;
		if (Array.isArray(legacyTasks)) return legacyTasks as CronTask[];
		return [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.setTaskSchedulerSettings({ legacyTasks: tasks });
	}

	getCronSchedulerState(): CronStoreState {
		const managed = this.getTaskSchedulerSettings().managed;
		return migrateCronStoreState(managed ?? emptyCronStoreState());
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.setTaskSchedulerSettings({ managed: migrateCronStoreState(state) });
	}

	getFridayCronState(): FridayCronStoreState {
		const settings = this.getTaskSchedulerSettings();
		const legacyFriday = readRecord((settings as { friday?: unknown }).friday);
		const hasRootFridayState =
			settings.schemaVersion !== undefined ||
			settings.jobs !== undefined;
		return migrateFridayCronStoreState(
			hasRootFridayState ? settings : (legacyFriday ?? emptyFridayCronStoreState())
		);
	}

	setFridayCronState(state: FridayCronStoreState): void {
		const {
			friday: _friday,
			schemaVersion: _schemaVersion,
			jobs: _jobs,
			states: _states,
			lastRuns: _lastRuns,
			runs: _runs,
			...settings
		} = this.getTaskSchedulerSettings() as TaskSchedulerSettings & {
			friday?: unknown;
			states?: unknown;
			lastRuns?: unknown;
			runs?: unknown;
		};
		this.store.set('taskScheduler', {
			...settings,
			...serializeFridayCronStoreState(state),
		});
	}

	private getTaskSchedulerSettings(): TaskSchedulerSettings {
		return (readRecord(this.store.get('taskScheduler')) ?? {}) as TaskSchedulerSettings;
	}

	private setTaskSchedulerSettings(patch: TaskSchedulerSettings): void {
		this.store.set('taskScheduler', {
			...this.getTaskSchedulerSettings(),
			...patch,
		});
	}
}
