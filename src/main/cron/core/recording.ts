import { randomUUID } from 'node:crypto';
import type {
	CronExecutionRecord,
	CronJsonObject,
	CronSchedule,
	CronScheduleId,
	CronScheduleStore,
} from './types';
import { CronScheduleRecoveryError, toCronRecordError } from './errors';
import { CronScheduleEventRecorder } from './events';

export class CronScheduleRunRecorder {
	constructor(
		private readonly store: CronScheduleStore,
		private readonly events: CronScheduleEventRecorder
	) {}

	idempotencyKey(scheduleId: CronScheduleId, scheduledRunAt: string): string {
		return `cron:${scheduleId}:${new Date(scheduledRunAt).toISOString()}`;
	}

	async record(
		schedule: CronSchedule,
		idempotencyKey: string,
		scheduledRunAt: string,
		status: CronExecutionRecord['status'],
		missedRun: boolean,
		metadata: CronJsonObject = {}
	): Promise<void> {
		const now = new Date().toISOString();
		await this.store.recordExecution({
			executionId: randomUUID(),
			scheduleId: schedule.id,
			idempotencyKey,
			scheduledRunAt,
			triggeredAt: now,
			taskId: typeof metadata.taskId === 'string' ? metadata.taskId : undefined,
			status,
			missedRun,
			runNumber: schedule.runCount + 1,
			metadata,
		});
	}

	async recordFailure(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		error: unknown
	): Promise<void> {
		const now = new Date().toISOString();
		const recordError = toCronRecordError(error);
		await this.store.recordExecution({
			executionId: randomUUID(),
			scheduleId: schedule.id,
			idempotencyKey: this.idempotencyKey(schedule.id, scheduledRunAt),
			scheduledRunAt,
			triggeredAt: now,
			status: 'taskFailed',
			missedRun,
			runNumber: schedule.runCount + 1,
			failedAt: now,
			error: recordError,
			metadata: {},
		});
		await this.store.updateSchedule(schedule.id, {
			lastFailedRunAt: now,
			updatedAt: now,
		});
		await this.events.emit({
			scheduleId: schedule.id,
			type: 'schedule.failed',
			userId: schedule.ownerUserId,
			source: schedule.source,
			message: 'Schedule run failed.',
			metadata: { error: recordError.safeUserMessage },
		});
	}

	async markRecoveryFailed(schedule: CronSchedule, error: unknown): Promise<void> {
		const now = new Date().toISOString();
		await this.store.updateSchedule(schedule.id, {
			status: 'failed',
			lastFailedRunAt: now,
			updatedAt: now,
		});
		await this.events.emit({
			scheduleId: schedule.id,
			type: 'schedule.failed',
			userId: schedule.ownerUserId,
			source: schedule.source,
			message: 'Schedule failed during startup recovery.',
			metadata: {
				error: toCronRecordError(
					new CronScheduleRecoveryError('Startup recovery failed.', { reason: String(error) })
				),
			},
		});
	}
}
