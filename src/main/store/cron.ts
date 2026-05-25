import type { CronTask } from '../../shared/cron';
import type { CronStoreState } from '../cron/core/cron.types';
import { emptyCronStoreState, migrateCronStoreState } from '../cron/store/cron-store-migrations';
import type { FridayCronStoreState } from '../cron/friday/store';
import {
	emptyFridayCronStoreState,
	migrateFridayCronStoreState,
	serializeFridayCronStoreState,
} from '../cron/friday/store';
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
		const legacyTasks = this.getCronSettings().legacyTasks;
		if (Array.isArray(legacyTasks)) return legacyTasks as CronTask[];
		return [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.setCronSettings({ legacyTasks: tasks });
	}

	getCronSchedulerState(): CronStoreState {
		const managed = this.getCronSettings().managed;
		return migrateCronStoreState(managed ?? emptyCronStoreState());
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.setCronSettings({ managed: migrateCronStoreState(state) });
	}

	getFridayCronState(): FridayCronStoreState {
		const settings = this.getCronSettings();
		const legacyFriday = readRecord((settings as { friday?: unknown }).friday);
		const hasRootFridayState = settings.schemaVersion !== undefined || settings.jobs !== undefined;
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
		} = this.getCronSettings() as CronSettings & {
			friday?: unknown;
			states?: unknown;
			lastRuns?: unknown;
			runs?: unknown;
		};
		this.store.set('cron', {
			...settings,
			...serializeFridayCronStoreState(state),
		});
	}

	private getCronSettings(): CronSettings {
		const cron = this.store.get('cron');
		const source = cron === undefined ? this.store.get('taskScheduler') : cron;
		return (readRecord(source) ?? {}) as CronSettings;
	}

	private setCronSettings(patch: CronSettings): void {
		this.store.set('cron', {
			...this.getCronSettings(),
			...patch,
		});
	}
}
