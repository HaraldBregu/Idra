import { randomUUID } from 'node:crypto';
import type {
	JsonObject,
	Task,
	TaskAttempt,
	TaskAuditLogEntry,
	TaskCleanupPolicy,
	TaskCreateRequest,
	TaskDefinition,
	TaskEvent,
	TaskEventType,
	TaskExecutionContext,
	TaskId,
	TaskListFilter,
	TaskLogEntry,
	TaskPermissionLevel,
	TaskProgress,
	TaskResult,
	TaskRetryPolicy,
	TaskStatus,
	TaskStore,
	TaskConfirmation,
	Workflow,
	WorkflowCreateRequest,
	WorkflowId,
} from '../core/task.types';
import { DEFAULT_RETRY_POLICY, EMPTY_PROGRESS } from '../core/task.types';
import {
	TaskCancellationError,
	TaskDependencyError,
	TaskLockError,
	TaskTimeoutError,
	TaskValidationError,
	toTaskError,
} from '../core/task.errors';
import { assertValidTransition, isTerminalStatus } from '../core/task.state-machine';
import { validateAgainstSchema } from '../core/task.schemas';
import { TaskDefinitionRegistry } from '../registry/task-definition-registry';
import { TaskEventBus } from '../events/task-event-bus';
import { DefaultTaskQueue } from '../queue/task-queue';
import type { ConcurrencyLimits } from '../queue/concurrency-limiter';
import { TaskScheduler } from '../scheduler/task-scheduler';
import { WorkflowManager } from '../workflow/workflow-manager';
import { MainProcessTaskRunner } from '../execution/main-process-task-runner';
import { TaskRunnerRegistry } from '../execution/task-runner-registry';
import { assertTaskPermissions, isDestructiveOrExternalPermission } from '../security/task-permissions';
import { redactSecrets, redactedMetadata, summarizeForAudit } from '../security/task-redaction';
import { TaskConfirmationManager } from '../security/task-confirmation-manager';

export interface TaskManagerServiceOptions {
	store: TaskStore;
	registry: TaskDefinitionRegistry;
	eventBus?: TaskEventBus;
	runnerRegistry?: TaskRunnerRegistry;
	confirmationManager?: TaskConfirmationManager;
	concurrency?: ConcurrencyLimits;
	clock?: () => Date;
	workerId?: string;
	lockTtlMs?: number;
	scopedServices?: unknown;
}

interface RunningTask {
	controller: AbortController;
	reason?: string;
}

export class TaskManagerService {
	private readonly store: TaskStore;
	private readonly registry: TaskDefinitionRegistry;
	private readonly eventBus: TaskEventBus;
	private readonly runnerRegistry: TaskRunnerRegistry;
	private readonly confirmationManager: TaskConfirmationManager;
	private readonly workflowManager: WorkflowManager;
	private readonly scheduler: TaskScheduler;
	private readonly queue: DefaultTaskQueue;
	private readonly clock: () => Date;
	private readonly workerId: string;
	private readonly lockTtlMs: number;
	private readonly scopedServices: unknown;
	private readonly runningTasks = new Map<TaskId, RunningTask>();
	private acceptingTasks = true;

	constructor(options: TaskManagerServiceOptions) {
		this.store = options.store;
		this.registry = options.registry;
		this.eventBus = options.eventBus ?? new TaskEventBus();
		this.runnerRegistry = options.runnerRegistry ?? new TaskRunnerRegistry();
		this.confirmationManager = options.confirmationManager ?? new TaskConfirmationManager();
		this.clock = options.clock ?? (() => new Date());
		this.workerId = options.workerId ?? `main-${process.pid}-${randomUUID()}`;
		this.lockTtlMs = options.lockTtlMs ?? 60_000;
		this.scopedServices = options.scopedServices;
		this.runnerRegistry.registerRunner('main', new MainProcessTaskRunner(this.workerId), { default: true });
		this.workflowManager = new WorkflowManager(this.store, this.clock);
		this.scheduler = new TaskScheduler(this);
		this.queue = new DefaultTaskQueue({
			store: this.store,
			concurrency: options.concurrency ?? {
				global: 6,
				perTaskType: {
					'ai.agent.run': 3,
					'file.index': 1,
				},
				perSource: {
					api: 10,
				},
				perUser: 4,
			},
			runTask: (task) => this.executeQueuedTask(task.id),
		});
		this.queue.start();
	}

	async createTask(request: TaskCreateRequest): Promise<Task> {
		if (!this.acceptingTasks) throw new TaskValidationError('Task manager is shutting down.');
		const definition = this.registry.getTaskDefinition(request.type);
		validateAgainstSchema(definition.inputSchema, request.input, 'input');
		assertTaskPermissions(definition, request);
		await this.assertNoDependencyCycle(request.dependencies?.map((dependency) => dependency.taskId) ?? []);

		const now = this.now();
		const retryPolicy = this.mergeRetryPolicy(definition.defaultRetryPolicy, request.retryPolicy);
		const scheduleNextRun = request.schedulePolicy ? this.scheduler.planNextRun(request.schedulePolicy, this.clock()) : undefined;
		const task: Task = {
			id: randomUUID(),
			type: request.type,
			title: request.title ?? definition.displayName,
			description: request.description ?? definition.description,
			source: request.source,
			sourceId: request.sourceId,
			parentTaskId: request.parentTaskId,
			childTaskIds: [],
			workflowId: request.workflowId,
			userId: request.userId,
			sessionId: request.sessionId,
			input: redactSecrets(request.input),
			status: scheduleNextRun ? 'scheduled' : 'pending',
			priority: request.priority ?? definition.defaultPriority,
			visibility: request.visibility ?? 'user',
			tags: request.tags ?? [],
			progress: EMPTY_PROGRESS(now),
			dependencies: request.dependencies ?? [],
			retryPolicy,
			schedulePolicy: request.schedulePolicy,
			timeoutMs: request.timeoutMs ?? definition.defaultTimeoutMs,
			cancellationMode: request.cancellationMode ?? definition.defaultCancellationMode ?? (definition.supportsCancellation ? 'cooperative' : 'disabled'),
			createdAt: now,
			updatedAt: now,
			nextRunAt: scheduleNextRun,
			attemptCount: 0,
			maxAttempts: retryPolicy.maxAttempts,
			metadata: redactedMetadata(request.metadata),
			audit: [this.audit('created', request.source, `Created task ${request.type}`, { inputSummary: summarizeForAudit(request.input) })],
		};

		await this.store.createTask(task);
		if (request.parentTaskId) await this.addChildToParent(request.parentTaskId, task.id);
		if (task.workflowId) await this.workflowManager.addTask(task.workflowId, task.id);
		await this.emitTaskEvent(task, 'task.created', 'Task created.');
		if (definition.requiresConfirmation || definition.requiredPermissions.some(isDestructiveOrExternalPermission)) {
			await this.requestConfirmation(task.id, {
				actionSummary: task.title,
				risks: ['This task may perform a sensitive, destructive, or external side effect.'],
				dataToBeSentSummary: summarizeForAudit(task.input),
			});
		} else if (request.autoStart) {
			await this.enqueueTask(task.id);
		} else if (task.status === 'scheduled' && task.nextRunAt) {
			this.scheduler.wakeTask(task.id, task.nextRunAt);
		}
		return this.store.getTask(task.id);
	}

	async enqueueTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (isTerminalStatus(task.status)) return;
		const dependencyDecision = await this.evaluateDependencies(task);
		if (dependencyDecision.action === 'wait') {
			await this.transition(task, 'waitingForDependency', { message: dependencyDecision.reason });
			await this.emitTaskEvent(await this.store.getTask(task.id), 'task.dependencyWaiting', dependencyDecision.reason);
			return;
		}
		if (dependencyDecision.action === 'fail') {
			await this.failWithoutRun(task, new TaskDependencyError(dependencyDecision.reason).toTaskError());
			return;
		}
		if (dependencyDecision.action === 'skip') {
			await this.transition(task, 'skipped', { message: dependencyDecision.reason });
			return;
		}

		const current = await this.store.getTask(taskId);
		await this.transition(current, 'queued', { queuedAt: this.now(), message: 'Task queued.' });
		await this.queue.enqueue(await this.store.getTask(taskId));
	}

	async runTask(taskId: TaskId): Promise<TaskResult> {
		await this.enqueueTask(taskId);
		return new Promise<TaskResult>((resolve) => {
			const unsubscribe = this.subscribeToTask(taskId, async (event) => {
				if (!['task.completed', 'task.failed', 'task.cancelled', 'task.timedOut'].includes(event.type)) return;
				unsubscribe();
				const task = await this.store.getTask(taskId);
				resolve({ status: task.status === 'completed' ? 'success' : 'failure', output: task.output, error: task.error });
			});
		});
	}

	async scheduleTask(request: TaskCreateRequest): Promise<Task> {
		return this.createTask({ ...request, schedulePolicy: request.schedulePolicy ?? { runAt: new Date().toISOString() } });
	}

	async cancelTask(taskId: TaskId, reason = 'cancelled'): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (task.cancellationMode === 'disabled') throw new TaskCancellationError('Task cancellation is disabled.', { taskId });
		this.queue.remove(taskId);
		const running = this.runningTasks.get(taskId);
		if (running) {
			running.reason = reason;
			running.controller.abort(new TaskCancellationError(reason, { taskId }));
			return;
		}
		if (!isTerminalStatus(task.status)) {
			await this.transition(task, 'cancelled', { cancelledAt: this.now(), message: reason });
		}
		await this.cancelChildTasks(taskId, reason);
	}

	async pauseTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		await this.transition(task, 'paused', { message: 'Task paused.' });
		this.queue.remove(taskId);
	}

	async resumeTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (task.status !== 'paused') throw new TaskValidationError(`Task is not paused: ${taskId}`);
		await this.enqueueTask(taskId);
		await this.emitTaskEvent(await this.store.getTask(taskId), 'task.resumed', 'Task resumed.');
	}

	async retryTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (!['failed', 'timedOut'].includes(task.status)) throw new TaskValidationError(`Task cannot be retried from ${task.status}`);
		await this.transition(task, 'retrying', { message: 'Retry requested.' });
		await this.enqueueTask(taskId);
	}

	async getTask(taskId: TaskId): Promise<Task> {
		return this.store.getTask(taskId);
	}

	async listTasks(filter?: TaskListFilter): Promise<Task[]> {
		return this.store.listTasks(filter);
	}

	async getTaskEvents(taskId: TaskId): Promise<TaskEvent[]> {
		return this.store.getEvents(taskId);
	}

	subscribeToTask(taskId: TaskId, listener: (event: TaskEvent) => void): () => void {
		return this.eventBus.subscribe({ taskId }, listener);
	}

	subscribeToTaskList(filter: TaskListFilter | undefined, listener: (event: TaskEvent) => void): () => void {
		return this.eventBus.subscribe({ taskListFilter: filter }, listener);
	}

	async createWorkflow(request: WorkflowCreateRequest): Promise<Workflow> {
		return this.workflowManager.createWorkflow(request);
	}

	async getWorkflow(workflowId: WorkflowId): Promise<Workflow> {
		return this.store.getWorkflow(workflowId);
	}

	async cancelWorkflow(workflowId: WorkflowId): Promise<void> {
		const tasks = await this.store.listTasks({ workflowId, includeTerminal: false });
		await Promise.all(tasks.map((task) => this.cancelTask(task.id, 'workflow_cancelled')));
		await this.store.updateWorkflow(workflowId, {
			status: 'cancelled',
			cancelledAt: this.now(),
			updatedAt: this.now(),
		});
	}

	async recoverIncompleteTasks(): Promise<void> {
		const recoverable = await this.store.listRecoverableTasks();
		for (const task of recoverable) {
			const definition = this.registry.getTaskDefinition(task.type);
			if (!definition.supportsRecovery && task.status === 'running') {
				await this.failWithoutRun(task, {
					code: 'INTERRUPTED',
					message: 'Task was interrupted and does not support recovery.',
					retryable: false,
					safeUserMessage: 'Task was interrupted.',
				});
				continue;
			}
			await this.store.updateTask(task.id, {
				status: 'queued',
				lockedBy: undefined,
				lockExpiresAt: undefined,
				updatedAt: this.now(),
			});
			await this.enqueueTask(task.id);
		}
	}

	async cleanupOldTasks(policy: TaskCleanupPolicy): Promise<void> {
		const cutoff = this.clock().getTime() - policy.olderThanMs;
		const statuses = policy.statuses ?? ['completed', 'failed', 'cancelled', 'timedOut', 'skipped'];
		const tasks = await this.store.listTasks({ status: statuses, includeTerminal: true });
		const deletable = tasks.filter((task) => Date.parse(task.updatedAt) <= cutoff).slice(0, policy.maxTasksToDelete ?? 500);
		await Promise.all(deletable.map((task) => this.store.deleteTask(task.id)));
	}

	async requestConfirmation(taskId: TaskId, details: { actionSummary: string; risks: string[]; dataToBeSentSummary?: string }): Promise<TaskConfirmation> {
		const task = await this.store.getTask(taskId);
		const confirmation = this.confirmationManager.requestConfirmation({
			taskId,
			userId: task.userId,
			actionSummary: details.actionSummary,
			risks: details.risks,
			dataToBeSentSummary: details.dataToBeSentSummary,
			expiresAt: new Date(this.clock().getTime() + 10 * 60_000).toISOString(),
		});
		await this.transition(task, 'waitingForConfirmation', {
			message: 'Task requires confirmation.',
			metadata: { confirmationId: confirmation.confirmationId },
		});
		await this.emitTaskEvent(await this.store.getTask(taskId), 'task.confirmationRequired', 'Confirmation required.', {
			confirmationId: confirmation.confirmationId,
		});
		return confirmation;
	}

	async confirmTask(confirmationId: string): Promise<void> {
		const taskId = this.confirmationManager.confirmTask(confirmationId);
		await this.enqueueTask(taskId);
	}

	async rejectTask(confirmationId: string): Promise<void> {
		const taskId = this.confirmationManager.rejectTask(confirmationId);
		await this.cancelTask(taskId, 'confirmation_rejected');
	}

	async shutdown(options: { cancelRunning?: boolean } = {}): Promise<void> {
		this.acceptingTasks = false;
		if (options.cancelRunning) {
			await Promise.all([...this.runningTasks.keys()].map((taskId) => this.cancelTask(taskId, 'shutdown')));
		}
		await this.queue.stop();
		this.scheduler.shutdown();
		await this.runnerRegistry.shutdown();
	}

	destroy(): void {
		void this.shutdown({ cancelRunning: false });
	}

	private async executeQueuedTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (task.status !== 'queued') return;
		const definition = this.registry.getTaskDefinition(task.type);
		const locked = await this.store.acquireLock(taskId, this.workerId, this.lockTtlMs);
		if (!locked) throw new TaskLockError(`Could not lock task ${taskId}`, { taskId });

		const controller = new AbortController();
		this.runningTasks.set(taskId, { controller });
		let timeout: NodeJS.Timeout | undefined;
		let timedOut = false;
		if (task.timeoutMs) {
			timeout = setTimeout(() => {
				timedOut = true;
				controller.abort(new TaskTimeoutError('Task attempt timed out.', { taskId }));
			}, task.timeoutMs);
			timeout.unref?.();
		}

		const attemptNumber = task.attemptCount + 1;
		const attempt: TaskAttempt = {
			id: randomUUID(),
			taskId,
			attemptNumber,
			status: 'running',
			startedAt: this.now(),
			workerId: this.workerId,
			metadata: {},
		};

		try {
			await this.store.createAttempt(attempt);
			await this.transition(task, 'running', {
				startedAt: task.startedAt ?? attempt.startedAt,
				attemptCount: attemptNumber,
				message: 'Task started.',
			});
			const context = this.createExecutionContext(await this.store.getTask(taskId), definition, attemptNumber, controller.signal);
			const result = await this.runWithAbort(await this.store.getTask(taskId), definition, context, controller.signal);
			if (result.status === 'failure') throw result.error ?? new Error('Task executor returned failure.');
			validateAgainstSchema(definition.outputSchema, result.output ?? {}, 'output');
			const completedAt = this.now();
			await this.store.updateAttempt(attempt.id, {
				status: 'completed',
				finishedAt: completedAt,
				durationMs: Date.parse(completedAt) - Date.parse(attempt.startedAt),
			});
			await this.transition(await this.store.getTask(taskId), 'completed', {
				completedAt,
				output: redactSecrets(result.output),
				progress: { percentage: 100, message: 'Task completed.', updatedAt: completedAt },
				message: 'Task completed.',
			});
			await this.afterTerminalTask(taskId);
		} catch (error) {
			const taskError = timedOut ? new TaskTimeoutError('Task timed out.', { taskId }).toTaskError() : toTaskError(error);
			const failedAt = this.now();
			await this.store.updateAttempt(attempt.id, {
				status: timedOut ? 'timedOut' : controller.signal.aborted ? 'cancelled' : 'failed',
				finishedAt: failedAt,
				durationMs: Date.parse(failedAt) - Date.parse(attempt.startedAt),
				error: taskError,
			});
			await this.handleExecutionFailure(await this.store.getTask(taskId), taskError, timedOut || controller.signal.aborted);
		} finally {
			if (timeout) clearTimeout(timeout);
			this.runningTasks.delete(taskId);
			await this.store.releaseLock(taskId, this.workerId);
		}
	}

	private createExecutionContext(task: Task, definition: TaskDefinition, attemptNumber: number, signal: AbortSignal): TaskExecutionContext {
		return {
			taskId: task.id,
			userId: task.userId,
			sessionId: task.sessionId,
			parentTaskId: task.parentTaskId,
			attemptNumber,
			signal,
			updateProgress: async (progress) => {
				const now = this.now();
				await this.store.updateTask(task.id, {
					progress: {
						...(await this.store.getTask(task.id)).progress,
						...progress,
						updatedAt: now,
					},
					updatedAt: now,
				});
				await this.emitTaskEvent(await this.store.getTask(task.id), 'task.progress', progress.message ?? 'Task progress updated.');
			},
			emitEvent: async (event) => {
				await this.emitTaskEvent(await this.store.getTask(task.id), event.type, event.message, event.metadata, event.progress);
			},
			log: async (entry) => {
				const log: TaskLogEntry = {
					id: randomUUID(),
					taskId: task.id,
					level: entry.level,
					message: summarizeForAudit(entry.message),
					createdAt: this.now(),
					metadata: redactedMetadata(entry.metadata),
				};
				await this.emitTaskEvent(await this.store.getTask(task.id), 'task.log', log.message, undefined, undefined, log);
			},
			spawnChildTask: (request) =>
				this.createTask({
					...request,
					parentTaskId: task.id,
					workflowId: request.workflowId ?? task.workflowId,
					userId: request.userId ?? task.userId,
					sessionId: request.sessionId ?? task.sessionId,
					availablePermissions: definition.requiredPermissions,
				}),
			getTask: (taskId) => this.store.getTask(taskId),
			getDependencyResult: async <TOutput = unknown>(taskId: TaskId) => {
				const dependency = await this.store.getTask(taskId);
				return {
					status: dependency.status === 'completed' ? 'success' : 'failure',
					output: dependency.output as TOutput | undefined,
					error: dependency.error,
				};
			},
			checkPermission: (permission: TaskPermissionLevel) => definition.requiredPermissions.includes(permission),
			getScopedServices: <TServices>() => this.scopedServices as TServices,
			metadata: task.metadata,
		};
	}

	private async handleExecutionFailure(task: Task, error: ReturnType<typeof toTaskError>, aborted: boolean): Promise<void> {
		if (aborted && error.code !== 'TIMEOUT') {
			await this.transition(task, 'cancelled', { cancelledAt: this.now(), error, message: error.safeUserMessage });
			await this.cancelChildTasks(task.id, error.message);
			await this.afterTerminalTask(task.id);
			return;
		}
		if (aborted && error.code === 'TIMEOUT') {
			await this.maybeRetryOrFinalize(task, error, 'timedOut');
			return;
		}
		await this.maybeRetryOrFinalize(task, error, 'failed');
	}

	private async runWithAbort(
		task: Task,
		definition: TaskDefinition,
		context: TaskExecutionContext,
		signal: AbortSignal
	): Promise<TaskResult> {
		if (signal.aborted) throw signal.reason;
		return Promise.race([
			this.runnerRegistry.getRunner().run(task, definition, context),
			new Promise<TaskResult>((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			}),
		]);
	}

	private async maybeRetryOrFinalize(task: Task, error: ReturnType<typeof toTaskError>, failureStatus: 'failed' | 'timedOut'): Promise<void> {
		if (this.shouldRetry(task, error)) {
			const delay = this.retryDelay(task.retryPolicy, task.attemptCount);
			const nextRunAt = new Date(this.clock().getTime() + delay).toISOString();
			await this.transition(task, 'retrying', {
				error,
				nextRunAt,
				message: `Task retrying in ${delay}ms.`,
			});
			setTimeout(() => void this.enqueueTask(task.id), delay).unref?.();
			return;
		}
		await this.transition(task, failureStatus, {
			error,
			failedAt: failureStatus === 'failed' ? this.now() : undefined,
			message: error.safeUserMessage,
		});
		await this.afterTerminalTask(task.id);
	}

	private shouldRetry(task: Task, error: ReturnType<typeof toTaskError>): boolean {
		if (task.attemptCount >= task.maxAttempts) return false;
		if (task.retryPolicy.nonRetryableErrorCodes.includes(error.code)) return false;
		return error.retryable || task.retryPolicy.retryableErrorCodes.includes(error.code);
	}

	private retryDelay(policy: TaskRetryPolicy, attemptCount: number): number {
		const base = Math.min(policy.maxDelayMs, policy.initialDelayMs * Math.pow(policy.backoffMultiplier, Math.max(0, attemptCount - 1)));
		if (!policy.jitter) return base;
		return Math.round(base * (0.8 + Math.random() * 0.4));
	}

	private async evaluateDependencies(task: Task): Promise<{ action: 'run' | 'wait' | 'fail' | 'skip'; reason: string }> {
		for (const dependency of task.dependencies) {
			const upstream = await this.store.getTask(dependency.taskId);
			const satisfied =
				dependency.type === 'completesBefore'
					? isTerminalStatus(upstream.status)
					: dependency.type === 'succeedsBefore' || dependency.type === 'producesOutputFor' || dependency.type === 'blocksUntil'
						? upstream.status === 'completed'
						: dependency.type === 'failsBefore'
							? upstream.status === 'failed' || upstream.status === 'timedOut'
							: false;
			if (satisfied) continue;
			if (isTerminalStatus(upstream.status)) {
				const policy = dependency.onFailure ?? 'fail';
				return { action: policy === 'ignore' ? 'run' : policy, reason: `Dependency ${dependency.taskId} ended as ${upstream.status}.` };
			}
			return { action: 'wait', reason: `Waiting for dependency ${dependency.taskId}.` };
		}
		return { action: 'run', reason: 'Dependencies satisfied.' };
	}

	private async afterTerminalTask(taskId: TaskId): Promise<void> {
		const task = await this.store.getTask(taskId);
		if (task.workflowId) await this.workflowManager.refreshWorkflowProgress(task.workflowId);
		await this.releaseDependents(taskId);
	}

	private async releaseDependents(taskId: TaskId): Promise<void> {
		const tasks = await this.store.listTasks({ includeTerminal: false });
		await Promise.all(
			tasks
				.filter((task) => task.dependencies.some((dependency) => dependency.taskId === taskId))
				.map((task) => this.enqueueTask(task.id))
		);
	}

	private async failWithoutRun(task: Task, error: ReturnType<typeof toTaskError>): Promise<void> {
		await this.transition(task, 'failed', {
			error,
			failedAt: this.now(),
			message: error.safeUserMessage,
		});
		await this.afterTerminalTask(task.id);
	}

	private async transition(
		task: Task,
		status: TaskStatus,
		patch: Partial<Task> & { message?: string } = {}
	): Promise<void> {
		assertValidTransition(task.status, status);
		const now = this.now();
		const audit = [
			...task.audit,
			this.audit(
				'transition',
				'task-manager',
				patch.message ?? `${task.status} -> ${status}`,
				patch.error?.code
					? { from: task.status, to: status, errorCode: patch.error.code }
					: { from: task.status, to: status }
			),
		];
		await this.store.updateTask(task.id, {
			...patch,
			status,
			updatedAt: now,
			audit,
		});
		const next = await this.store.getTask(task.id);
		const eventType = this.eventTypeForStatus(status);
		if (eventType) await this.emitTaskEvent(next, eventType, patch.message);
	}

	private eventTypeForStatus(status: TaskStatus): TaskEventType | undefined {
		switch (status) {
			case 'queued':
				return 'task.queued';
			case 'running':
				return 'task.started';
			case 'completed':
				return 'task.completed';
			case 'failed':
				return 'task.failed';
			case 'cancelled':
				return 'task.cancelled';
			case 'timedOut':
				return 'task.timedOut';
			case 'retrying':
				return 'task.retrying';
			case 'paused':
				return 'task.paused';
			default:
				return undefined;
		}
	}

	private async emitTaskEvent(
		task: Task,
		type: TaskEventType,
		message?: string,
		metadata: JsonObject = {},
		progress?: TaskProgress,
		log?: TaskLogEntry
	): Promise<void> {
		const event: TaskEvent = {
			id: randomUUID(),
			taskId: task.id,
			workflowId: task.workflowId,
			type,
			message,
			progress,
			log,
			error: task.error,
			createdAt: this.now(),
			metadata: redactedMetadata(metadata),
		};
		await this.store.appendEvent(event);
		this.eventBus.publish(event);
	}

	private async addChildToParent(parentTaskId: TaskId, childTaskId: TaskId): Promise<void> {
		const parent = await this.store.getTask(parentTaskId);
		if (parent.childTaskIds.includes(childTaskId)) return;
		await this.store.updateTask(parentTaskId, {
			childTaskIds: [...parent.childTaskIds, childTaskId],
			updatedAt: this.now(),
		});
	}

	private async cancelChildTasks(parentTaskId: TaskId, reason: string): Promise<void> {
		const children = await this.store.listTasks({ parentTaskId, includeTerminal: false });
		await Promise.all(children.map((child) => this.cancelTask(child.id, reason)));
	}

	private async assertNoDependencyCycle(dependencies: TaskId[]): Promise<void> {
		const visiting = new Set<TaskId>();
		const visit = async (taskId: TaskId): Promise<void> => {
			if (visiting.has(taskId)) throw new TaskDependencyError('Task dependency cycle detected.', { taskId });
			visiting.add(taskId);
			const task = await this.store.getTask(taskId);
			for (const dependency of task.dependencies) await visit(dependency.taskId);
			visiting.delete(taskId);
		};
		for (const dependency of dependencies) await visit(dependency);
	}

	private mergeRetryPolicy(base: TaskRetryPolicy, patch: Partial<TaskRetryPolicy> = {}): TaskRetryPolicy {
		return { ...DEFAULT_RETRY_POLICY, ...base, ...patch };
	}

	private audit(action: string, actor: TaskAuditLogEntry['actor'], message: string, metadata: JsonObject = {}, taskId = ''): TaskAuditLogEntry {
		return {
			id: randomUUID(),
			taskId,
			action,
			actor,
			message: summarizeForAudit(message),
			createdAt: this.now(),
			metadata: redactedMetadata(metadata),
		};
	}

	private now(): string {
		return this.clock().toISOString();
	}
}
