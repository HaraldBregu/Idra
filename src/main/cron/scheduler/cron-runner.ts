import { randomUUID } from 'node:crypto';
import type {
	CronSchedule,
	CronScheduleId,
	CronScheduleRunner,
	CronScheduledTask,
} from '../core/cron.types';
import { AGENT_TASK_TYPE, type TaskManager } from '../../tasks';
import type { TaskRecord } from '../../../shared/tasks';
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
			type: AGENT_TASK_TYPE,
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

	async findExistingTask(filter: {
		scheduleId: CronScheduleId;
		scheduledRunAt: string;
	}): Promise<CronScheduledTask | undefined> {
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

function stringFromMetadata(metadata: Record<string, unknown>, key: string): string | undefined {
	const value = metadata[key];
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function stringArrayFromMetadata(metadata: Record<string, unknown>, key: string): string[] {
	const value = metadata[key];
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item] : []));
}

function cronStatusFromTaskStatus(status: TaskRecord['status']): CronScheduledTask['status'] {
	if (status === 'succeeded') return 'completed';
	if (status === 'failed') return 'failed';
	if (status === 'cancelled') return 'cancelled';
	if (status === 'cancelling') return 'running';
	return status;
}

function taskRecordToCronScheduledTask(record: TaskRecord): CronScheduledTask | undefined {
	const metadata = record.metadata;
	const cronScheduleId = stringFromMetadata(metadata, 'cronScheduleId');
	const scheduledRunAt = stringFromMetadata(metadata, 'scheduledRunAt');
	if (!cronScheduleId || !scheduledRunAt) return undefined;
	return {
		id: record.id,
		type: record.type,
		title: record.title,
		description: stringFromMetadata(metadata, 'cronDescription'),
		source: 'cron',
		sourceId: cronScheduleId,
		userId: stringFromMetadata(metadata, 'cronUserId'),
		sessionId: stringFromMetadata(metadata, 'cronSessionId'),
		input: redactCronValue((metadata.cronInput ?? {}) as CronScheduledTask['input']),
		status: cronStatusFromTaskStatus(record.status),
		priority:
			(stringFromMetadata(metadata, 'cronPriority') as CronScheduledTask['priority']) ?? 'normal',
		visibility:
			(stringFromMetadata(metadata, 'cronVisibility') as CronScheduledTask['visibility']) ?? 'user',
		tags: stringArrayFromMetadata(metadata, 'cronTags'),
		metadata: {
			cronScheduleId,
			scheduledRunAt,
			actualTriggeredAt: stringFromMetadata(metadata, 'actualTriggeredAt') ?? record.createdAt,
			runNumber: typeof metadata.runNumber === 'number' ? metadata.runNumber : 1,
			missedRun: metadata.missedRun === true,
			createdBySchedulerId: stringFromMetadata(metadata, 'createdBySchedulerId') ?? '',
			idempotencyKey: stringFromMetadata(metadata, 'idempotencyKey') ?? '',
		},
		createdAt: record.createdAt,
		updatedAt: record.finishedAt ?? record.startedAt ?? record.createdAt,
	};
}

export class TaskManagerCronScheduleRunner implements CronScheduleRunner {
	constructor(private readonly taskManager: TaskManager) {}

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
		const record = this.taskManager.startUserTask({
			type: AGENT_TASK_TYPE,
			title: schedule.name,
			input: schedule.taskInput,
			metadata: {
				...schedule.taskMetadata,
				cronScheduleId: schedule.id,
				cronDescription: schedule.description,
				cronUserId: schedule.ownerUserId,
				cronSessionId: schedule.sessionId,
				cronInput: redactCronValue(schedule.taskInput),
				cronPriority: schedule.taskPriority,
				cronVisibility: schedule.visibility,
				cronTags: ['cron', ...schedule.taskTags],
				scheduledRunAt: input.scheduledRunAt,
				actualTriggeredAt: input.actualTriggeredAt,
				runNumber: input.runNumber,
				missedRun: input.missedRun,
				createdBySchedulerId: input.runnerId,
				idempotencyKey: input.idempotencyKey,
			},
		});
		const task = taskRecordToCronScheduledTask(record);
		if (!task) throw new Error('Cron task metadata was not recorded.');
		return task;
	}

	async findExistingTask(filter: {
		scheduleId: CronScheduleId;
		scheduledRunAt: string;
	}): Promise<CronScheduledTask | undefined> {
		for (const record of this.taskManager.list()) {
			const task = taskRecordToCronScheduledTask(record);
			if (
				task?.sourceId === filter.scheduleId &&
				task.metadata.scheduledRunAt === filter.scheduledRunAt
			) {
				return task;
			}
		}
		return undefined;
	}

	async listRunningTasks(scheduleId: CronScheduleId): Promise<CronScheduledTask[]> {
		return this.taskManager.list().flatMap((record) => {
			const task = taskRecordToCronScheduledTask(record);
			return task && task.sourceId === scheduleId && !terminal(task.status) ? [task] : [];
		});
	}

	async cancelRunningTasks(scheduleId: CronScheduleId): Promise<void> {
		const running = await this.listRunningTasks(scheduleId);
		for (const task of running) {
			this.taskManager.cancel(task.id);
		}
	}
}

export class DelegatingCronScheduleRunner implements CronScheduleRunner {
	constructor(private delegate: CronScheduleRunner = new InMemoryCronScheduleRunner()) {}

	setDelegate(delegate: CronScheduleRunner): void {
		this.delegate = delegate;
	}

	createTaskForSchedule(
		input: Parameters<CronScheduleRunner['createTaskForSchedule']>[0]
	): Promise<CronScheduledTask> {
		return this.delegate.createTaskForSchedule(input);
	}

	findExistingTask(filter: {
		scheduleId: CronScheduleId;
		scheduledRunAt: string;
	}): Promise<CronScheduledTask | undefined> {
		return this.delegate.findExistingTask?.(filter) ?? Promise.resolve(undefined);
	}

	listRunningTasks(scheduleId: CronScheduleId): Promise<CronScheduledTask[]> {
		return this.delegate.listRunningTasks?.(scheduleId) ?? Promise.resolve([]);
	}

	cancelRunningTasks(scheduleId: CronScheduleId, reason: string): Promise<void> {
		return this.delegate.cancelRunningTasks?.(scheduleId, reason) ?? Promise.resolve();
	}
}
