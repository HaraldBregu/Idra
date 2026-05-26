import Store from 'electron-store';
import type { CronTask } from '../../../shared/cron';
import type { CronStoreState } from '../core/cron.types';
import { migrateCronStoreState } from './cron-store-migrations';

type CronElectronStoreSchema = {
	tasks?: CronTask[];
	scheduler?: unknown;
};

export interface CronElectronStoreAccessor {
	get(key: string): unknown;
	set(key: string, value: unknown): void;
	delete(key: string): void;
}

export interface CronPersistenceStore {
	getCronTasks(): CronTask[];
	setCronTasks(tasks: CronTask[]): void;
	getCronSchedulerState(): CronStoreState;
	setCronSchedulerState(state: CronStoreState): void;
}

export class ElectronStoreCronStore implements CronPersistenceStore {
	private readonly store: CronElectronStoreAccessor;

	constructor(store?: CronElectronStoreAccessor) {
		this.store =
			store ??
			(new Store<CronElectronStoreSchema>({
				name: 'cron',
				accessPropertiesByDotNotation: false,
			}) as unknown as CronElectronStoreAccessor);
	}

	getCronTasks(): CronTask[] {
		const tasks = this.store.get('tasks');
		return Array.isArray(tasks) ? (tasks as CronTask[]) : [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.store.set('tasks', tasks);
	}

	getCronSchedulerState(): CronStoreState {
		return migrateCronStoreState(this.store.get('scheduler'));
	}

	setCronSchedulerState(state: CronStoreState): void {
		this.store.set('scheduler', migrateCronStoreState(state));
	}
}
