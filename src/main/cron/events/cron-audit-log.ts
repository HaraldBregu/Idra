import type {
	CronAuditLog,
	CronScheduleAuditEntry,
	CronScheduleId,
	CronScheduleStore,
} from '../core/cron.types';

export class CronScheduleAuditLog implements CronAuditLog {
	constructor(private readonly store: CronScheduleStore) {}

	async append(entry: CronScheduleAuditEntry): Promise<void> {
		const schedule = await this.store.getSchedule(entry.scheduleId);
		await this.store.updateSchedule(entry.scheduleId, {
			audit: [...schedule.audit, entry],
			updatedAt: schedule.updatedAt,
		});
	}

	async list(scheduleId: CronScheduleId): Promise<CronScheduleAuditEntry[]> {
		return (await this.store.getSchedule(scheduleId)).audit;
	}
}
