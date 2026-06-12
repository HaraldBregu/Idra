import { randomUUID } from 'node:crypto';
import type {
	CronJsonObject,
	CronSchedule,
	CronScheduleAuditEntry,
	CronScheduleEvent,
	CronScheduleSource,
	CronScheduleStore,
} from './types';
import { CronScheduleEventBus, redactCronValue, summarizeCronValue } from '../engine/support';

export class CronScheduleEventRecorder {
	constructor(
		private readonly store: CronScheduleStore,
		private readonly eventBus: CronScheduleEventBus
	) {}

	audit(
		schedule: Pick<CronSchedule, 'id'>,
		action: string,
		message: string,
		actor: CronScheduleSource | 'cron-scheduler' | 'cron-ipc' | 'agent-cron-service'
	): CronScheduleAuditEntry {
		return {
			auditId: randomUUID(),
			scheduleId: schedule.id,
			action,
			actor,
			message,
			createdAt: new Date().toISOString(),
			metadata: {},
		};
	}

	async emit(input: Omit<CronScheduleEvent, 'eventId' | 'timestamp'>): Promise<void> {
		const event: CronScheduleEvent = {
			...input,
			eventId: randomUUID(),
			timestamp: new Date().toISOString(),
		};
		if (input.scheduleId !== 'pending') await this.store.appendScheduleEvent(event);
		this.eventBus.emit(event);
	}

	auditMetadata(schedule: CronSchedule): CronJsonObject {
		return {
			taskType: schedule.taskType,
			source: schedule.source,
			visibility: schedule.visibility,
			timezone: schedule.timezone,
			nextRunAt: schedule.nextRunAt ?? null,
			taskInputSummary: summarizeCronValue(redactCronValue(schedule.taskInput)),
		};
	}
}
