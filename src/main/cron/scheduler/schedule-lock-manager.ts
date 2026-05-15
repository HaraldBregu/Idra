import type { CronScheduleId, CronScheduleStore } from '../core/cron.types';

export class ScheduleLockManager {
	constructor(
		private readonly store: CronScheduleStore,
		private readonly runnerId: string,
		private readonly ttlMs: number
	) {}

	acquire(scheduleId: CronScheduleId): Promise<boolean> {
		return this.store.acquireScheduleLock(scheduleId, this.runnerId, this.ttlMs);
	}

	release(scheduleId: CronScheduleId): Promise<void> {
		return this.store.releaseScheduleLock(scheduleId, this.runnerId);
	}
}
