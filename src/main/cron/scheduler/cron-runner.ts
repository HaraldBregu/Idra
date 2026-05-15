import { randomUUID } from 'node:crypto';
import type {
	CronSchedule,
	CronScheduleId,
	CronScheduleRunner,
	CronTaskManagerPort,
} from '../core/cron.types';
import type {
	Task,
	TaskCreateRequest,
	TaskListFilter,
	TaskPriority,
	TaskStatus,
} from '../../task-manager/core/task.types';
import { DEFAULT_RETRY_POLICY, EMPTY_PROGRESS } from '../../task-manager/core/task.types';
import { InMemoryTaskStore } from '../../task-manager/store/in-memory-task-store';
import { redactCronValue } from '../security/cron-redaction';

function toTaskPriority(priority: CronSchedule['taskPriority']): TaskPriority {
	return priority;
}

function terminal(status: TaskStatus): boolean {
	return ['completed', 'failed', 'cancelled', 'timedOut', 'skipped'].includes(status);
}

export class StoreBackedCronTaskManager implements CronTaskManagerPort {
	constructor(private readonly store = new InMemoryTaskStore()) {}

	async createTask(request: TaskCreateRequest): Promise<Task> {
		const now = new Date().toISOString();
		const task: Task = {
			id: randomUUID(),
			type: request.type,
			title: request.title ?? request.type,
			description: request.description,
			source: request.source,
			sourceId: request.sourceId,
			parentTaskId: request.parentTaskId,
			childTaskIds: [],
			workflowId: request.workflowId,
			userId: request.userId,
			sessionId: request.sessionId,
			input: request.input,
			status: request.autoStart === false ? 'scheduled' : 'queued',
			priority: request.priority ?? 'normal',
			visibility: request.visibility ?? 'user',
			tags: request.tags ?? [],
			progress: EMPTY_PROGRESS(now),
			dependencies: request.dependencies ?? [],
			retryPolicy: {
				...DEFAULT_RETRY_POLICY,
				...(request.retryPolicy ?? {}),
			},
			schedulePolicy: request.schedulePolicy,
			timeoutMs: request.timeoutMs,
			cancellationMode: request.cancellationMode ?? 'cooperative',
			createdAt: now,
			updatedAt: now,
			queuedAt: request.autoStart === false ? undefined : now,
			attemptCount: 0,
			maxAttempts: request.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
			metadata: request.metadata ?? {},
			audit: [
				{
					id: randomUUID(),
					taskId: 'pending',
					action: 'task.created',
					actor: request.source,
					message: 'Task created by cron scheduler.',
					createdAt: now,
					metadata: {},
				},
			],
		};
		task.audit = task.audit.map((entry) => ({ ...entry, taskId: task.id }));
		await this.store.createTask(task);
		return task;
	}

	async listTasks(filter: TaskListFilter = {}): Promise<Task[]> {
		return this.store.listTasks(filter);
	}

	async cancelTask(taskId: string, reason?: string): Promise<void> {
		await this.store.updateTask(taskId, {
			status: 'cancelled',
			cancelledAt: new Date().toISOString(),
			metadata: { cancelReason: reason ?? 'Cancelled by cron scheduler.' },
		});
	}

	async enqueueTask(taskId: string): Promise<void> {
		await this.store.updateTask(taskId, {
			status: 'queued',
			queuedAt: new Date().toISOString(),
		});
	}
}

export class TaskManagerCronScheduleRunner implements CronScheduleRunner {
	constructor(private readonly taskManager: CronTaskManagerPort) {}

	async createTaskForSchedule(input: {
		schedule: CronSchedule;
		scheduledRunAt: string;
		actualTriggeredAt: string;
		runNumber: number;
		missedRun: boolean;
		idempotencyKey: string;
		runnerId: string;
	}): Promise<Task> {
		const schedule = input.schedule;
		const task = await this.taskManager.createTask({
			type: schedule.taskType,
			title: schedule.name,
			description: schedule.description,
			source: 'cron',
			sourceId: schedule.id,
			userId: schedule.ownerUserId,
			sessionId: schedule.sessionId,
			input: redactCronValue(schedule.taskInput),
			priority: toTaskPriority(schedule.taskPriority),
			visibility: schedule.visibility,
			tags: ['cron', ...schedule.taskTags],
			retryPolicy: schedule.retryPolicy,
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
			autoStart: true,
		});
		await this.taskManager.enqueueTask?.(task.id);
		return task;
	}

	async findExistingTask(filter: { scheduleId: CronScheduleId; scheduledRunAt: string }): Promise<Task | undefined> {
		const tasks = await this.taskManager.listTasks({
			source: 'cron',
			sourceId: filter.scheduleId,
			includeTerminal: true,
		} as TaskListFilter & { sourceId: string });
		return tasks.find(
			(task) =>
				task.sourceId === filter.scheduleId &&
				task.metadata.cronScheduleId === filter.scheduleId &&
				task.metadata.scheduledRunAt === filter.scheduledRunAt
		);
	}

	async listRunningTasks(scheduleId: CronScheduleId): Promise<Task[]> {
		const tasks = await this.taskManager.listTasks({
			source: 'cron',
			includeTerminal: false,
		});
		return tasks.filter(
			(task) =>
				task.sourceId === scheduleId &&
				task.metadata.cronScheduleId === scheduleId &&
				!terminal(task.status)
		);
	}

	async cancelRunningTasks(scheduleId: CronScheduleId, reason: string): Promise<void> {
		const running = await this.listRunningTasks(scheduleId);
		await Promise.all(running.map((task) => this.taskManager.cancelTask?.(task.id, reason)));
	}
}
