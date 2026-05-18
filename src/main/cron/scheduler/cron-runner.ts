import { randomUUID } from 'node:crypto';
import type {
	CronSchedule,
	CronScheduleId,
	CronScheduleRunner,
	CronScheduledTask,
} from '../core/cron.types';
import { redactCronValue } from '../security/cron-redaction';

function terminal(status: CronScheduledTask['status']): boolean {
	return ['completed', 'failed', 'cancelled'].includes(status);
}

export class InMemoryCronScheduleRunner implements CronScheduleRunner {
	private readonly tasks = new Map<string, CronScheduledTask>();

	async createTaskForSchedule(input: {
		schedule: CronSchedule;
		scheduledRunAt: string;
		actualTriggeredAt: string;
		runNumber: number;
		missedRun: boolean;
		idempotencyKey: string;
		runnerId: string;
	}): Promise<CronScheduledTask> {
		const schedule = input.schedule;
		const now = new Date().toISOString();
		const task: CronScheduledTask = {
			id: randomUUID(),
			type: schedule.taskType,
			title: schedule.name,
			description: schedule.description,
			source: 'cron',
			sourceId: schedule.id,
			userId: schedule.ownerUserId,
			sessionId: schedule.sessionId,
			input: redactCronValue(schedule.taskInput),
			status: 'queued',
			priority: schedule.taskPriority,
			visibility: schedule.visibility,
			tags: ['cron', ...schedule.taskTags],
			metadata: {
				...schedule.taskMetadata,
				cronScheduleId: schedule.id,
				scheduledRunAt: input.scheduledRunAt,
				actualTriggeredAt: input.actualTriggeredAt,
				runNumber: input.runNumber,
				missedRun: input.missedRun,
				createdBySchedulerId: input.runnerId,
				idempotencyKey: input.idempotencyKey,
			},
			createdAt: now,
			updatedAt: now,
		};
		this.tasks.set(task.id, task);
		return task;
	}

	async findExistingTask(filter: { scheduleId: CronScheduleId; scheduledRunAt: string }): Promise<CronScheduledTask | undefined> {
		return Array.from(this.tasks.values()).find(
			(task) =>
				task.sourceId === filter.scheduleId &&
				task.metadata.cronScheduleId === filter.scheduleId &&
				task.metadata.scheduledRunAt === filter.scheduledRunAt
		);
	}

	async listRunningTasks(scheduleId: CronScheduleId): Promise<CronScheduledTask[]> {
		return Array.from(this.tasks.values()).filter(
			(task) =>
				task.sourceId === scheduleId &&
				task.metadata.cronScheduleId === scheduleId &&
				!terminal(task.status)
		);
	}

	async cancelRunningTasks(scheduleId: CronScheduleId, reason: string): Promise<void> {
		const running = await this.listRunningTasks(scheduleId);
		for (const task of running) {
			this.tasks.set(task.id, {
				...task,
				status: 'cancelled',
				updatedAt: new Date().toISOString(),
				metadata: {
					...task.metadata,
					cancelReason: reason,
				},
			});
		}
	}
}
