import { randomUUID } from 'node:crypto';
import type {
	CronActorContext,
	CronExecutionRecord,
	CronJsonObject,
	CronJsonValue,
	CronNextRunPreview,
	CronRetryPolicy,
	CronRunPolicy,
	CronSchedule,
	CronScheduleAccessPolicy,
	CronScheduleAuditEntry,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleId,
	CronScheduler,
	CronSchedulerOptions,
	CronScheduleRunner,
	CronScheduleSource,
	CronScheduleUpdateRequest,
	CronScheduleStore,
	CronScheduledTask,
} from '../core/cron.types';
import { ScheduleDescriber } from '../core/cron.describer';
import {
	CronScheduleExecutionError,
	CronScheduleRecoveryError,
	CronScheduleValidationError,
	CronSchedulerError,
	toCronRecordError,
} from '../core/cron.errors';
import { assertScheduleCanRun, validateScheduleShape } from '../core/cron.validation';
import { CronNextRunCalculator } from './cron-next-run-calculator';
import { CronScheduleEventBus } from '../events/cron-event-bus';
import { redactCronValue, summarizeCronValue } from '../security/cron-redaction';
import { AGENT_TASK_TYPE } from '../../tasks';

interface CronLogger {
	debug(scope: string, message: string, metadata?: unknown): void;
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}

export const DEFAULT_CRON_RETRY_POLICY: CronRetryPolicy = {
	maxAttempts: 1,
	initialDelayMs: 500,
	maxDelayMs: 15_000,
	backoffMultiplier: 2,
	jitter: true,
	retryableErrorCodes: ['CRON_SCHEDULE_EXECUTION_TRANSIENT', 'CRON_SCHEDULE_LOCK_FAILED'],
	nonRetryableErrorCodes: ['CRON_SCHEDULE_VALIDATION_FAILED', 'CRON_PERMISSION_DENIED'],
};

export const DEFAULT_CRON_RUN_POLICY: CronRunPolicy = {
	maxCatchUpRuns: 5,
	catchUpWindowMs: 24 * 60 * 60_000,
	minIntervalMs: 60_000,
	maxRunsPerTurn: 20,
	highFrequencyThresholdMs: 5 * 60_000,
	dstPolicy: 'skipNonexistentTime',
};

export const DEFAULT_CRON_SCHEDULER_OPTIONS: CronSchedulerOptions = {
	runnerId: `cron-${process.pid}-${randomUUID()}`,
	pollIntervalMs: 30_000,
	lockTtlMs: 2 * 60_000,
	maxToolCallsPerTurn: 20,
	maxPlanningDepth: 10,
	totalTurnTimeoutMs: 5 * 60_000,
	runPolicy: DEFAULT_CRON_RUN_POLICY,
	defaultRetryPolicy: DEFAULT_CRON_RETRY_POLICY,
	defaultTimezone: 'UTC',
};

const SECRET_KEY_PATTERN =
	/(api[-_]?key|token|secret|password|credential|authorization|oauth|private[-_]?key)/i;
const RUNTIME_CONFIG_KEY_PATTERN =
	/^(provider|providerId|providerConfig|model|modelId|modelConfig|baseUrl|baseURL|apiBaseUrl|endpointUrl)$/;
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
	/authorization\s*:\s*bearer\s+\S+/i,
	/(?:api[-_]?key|credential|password|secret|token)\s*[:=]\s*\S+/i,
];
const AGENT_TASK_INPUT_KEYS = new Set(['message']);
const MAX_AGENT_INSTRUCTION_LENGTH = 200_000;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeRetryPolicy(
	base: CronRetryPolicy,
	patch?: Partial<CronRetryPolicy>
): CronRetryPolicy {
	return {
		...base,
		...(patch ?? {}),
		retryableErrorCodes: patch?.retryableErrorCodes ?? base.retryableErrorCodes,
		nonRetryableErrorCodes: patch?.nonRetryableErrorCodes ?? base.nonRetryableErrorCodes,
	};
}

function assertSafeStoredScheduleValue(value: CronJsonValue, path = 'taskInput'): void {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => assertSafeStoredScheduleValue(entry, `${path}[${index}]`));
		return;
	}
	if (typeof value === 'string') {
		if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
			throw new CronScheduleExecutionError(
				`Sensitive value cannot be stored in cron schedule: ${path}`,
				{
					field: path,
				}
			);
		}
		return;
	}
	if (!value || typeof value !== 'object') return;
	for (const [key, child] of Object.entries(value)) {
		if (SECRET_KEY_PATTERN.test(key)) {
			throw new CronScheduleExecutionError(
				`Sensitive field cannot be stored in cron schedule: ${path}.${key}`,
				{
					field: `${path}.${key}`,
				}
			);
		}
		if (RUNTIME_CONFIG_KEY_PATTERN.test(key)) {
			throw new CronScheduleExecutionError(
				`Runtime configuration cannot be stored in cron schedule: ${path}.${key}`,
				{
					field: `${path}.${key}`,
				}
			);
		}
		assertSafeStoredScheduleValue(child, `${path}.${key}`);
	}
}

function assertSafeStoredSchedulePayload(
	request: CronScheduleCreateRequest | CronScheduleUpdateRequest
): void {
	if (request.taskInput !== undefined)
		assertSafeStoredScheduleValue(request.taskInput, 'taskInput');
	if (request.taskMetadata !== undefined)
		assertSafeStoredScheduleValue(request.taskMetadata, 'taskMetadata');
	if (request.metadata !== undefined) assertSafeStoredScheduleValue(request.metadata, 'metadata');
}

function assertOnlyAgentInstruction(input: Record<string, unknown>): void {
	for (const key of Object.keys(input)) {
		if (!AGENT_TASK_INPUT_KEYS.has(key)) {
			throw new CronScheduleValidationError(
				`Scheduled agent input only supports message; ${key} is not allowed.`,
				{ field: `taskInput.${key}` }
			);
		}
	}
}

function normalizeAgentTaskInput(value: CronJsonValue | undefined): CronJsonObject {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new CronScheduleValidationError('taskInput must be an object with a message.');
	}
	assertOnlyAgentInstruction(value);
	if (typeof value.message !== 'string') {
		throw new CronScheduleValidationError('taskInput.message is required.');
	}
	const message = value.message.trim();
	if (!message) throw new CronScheduleValidationError('taskInput.message is required.');
	if (message.length > MAX_AGENT_INSTRUCTION_LENGTH) {
		throw new CronScheduleValidationError('taskInput.message is too long.');
	}
	if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(message))) {
		throw new CronScheduleValidationError('taskInput.message contains secret-looking content.');
	}
	return { message };
}

function normalizeAgentScheduleTask(
	request: CronScheduleCreateRequest | CronScheduleUpdateRequest,
	existing?: CronSchedule
): { taskType: string; taskInput: CronJsonObject } {
	const taskType = request.taskType ?? existing?.taskType;
	if (taskType !== AGENT_TASK_TYPE) {
		throw new CronScheduleValidationError(
			`Scheduled tasks must create ${AGENT_TASK_TYPE} background tasks.`
		);
	}
	return {
		taskType: AGENT_TASK_TYPE,
		taskInput: normalizeAgentTaskInput(request.taskInput ?? existing?.taskInput),
	};
}

export class CronSchedulerService implements CronScheduler {
	private readonly options: CronSchedulerOptions;
	private readonly calculator: CronNextRunCalculator;
	private readonly describer: ScheduleDescriber;
	private readonly eventBus: CronScheduleEventBus;
	private timer: NodeJS.Timeout | undefined;
	private started = false;

	constructor(
		private readonly store: CronScheduleStore,
		private readonly runner: CronScheduleRunner,
		private readonly accessPolicy: CronScheduleAccessPolicy,
		options: Partial<CronSchedulerOptions> = {},
		private readonly logger?: CronLogger
	) {
		this.options = {
			...DEFAULT_CRON_SCHEDULER_OPTIONS,
			...options,
			runPolicy: { ...DEFAULT_CRON_RUN_POLICY, ...(options.runPolicy ?? {}) },
			defaultRetryPolicy: mergeRetryPolicy(DEFAULT_CRON_RETRY_POLICY, options.defaultRetryPolicy),
		};
		this.calculator = new CronNextRunCalculator();
		this.describer = new ScheduleDescriber();
		this.eventBus = new CronScheduleEventBus();
	}

	get events(): CronScheduleEventBus {
		return this.eventBus;
	}

	async start(): Promise<void> {
		if (this.started) return;
		this.started = true;
		await this.recoverSchedulesOnStartup();
		this.timer = setInterval(() => {
			void this.processDueSchedules(new Date()).catch((error) => {
				this.logger?.error('CronScheduler', 'Failed to process due schedules.', error);
			});
		}, this.options.pollIntervalMs);
		this.timer.unref?.();
	}

	async stop(): Promise<void> {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
		this.started = false;
	}

	async reload(): Promise<void> {
		await this.recoverSchedulesOnStartup();
	}

	async createSchedule(
		request: CronScheduleCreateRequest,
		actor = this.systemActor(request.ownerUserId)
	): Promise<CronSchedule> {
		await this.accessPolicy.authorize({ action: 'createSchedule', request, actor });
		this.accessPolicy.validateFrequency({ request, actor });
		validateScheduleShape(request, this.options.runPolicy);
		assertSafeStoredSchedulePayload(request);

		const now = new Date();
		const nowIso = now.toISOString();
		const schedule: CronSchedule = {
			id: randomUUID(),
			name: request.name.trim(),
			description: request.description?.trim(),
			type: request.type,
			status: request.enabled === false ? 'disabled' : 'active',
			source: request.source,
			sourceId: request.sourceId,
			ownerUserId: request.ownerUserId ?? actor.userId,
			sessionId: request.sessionId ?? actor.sessionId,
			createdBy: request.createdBy,
			visibility: request.visibility ?? 'user',
			timezone: request.timezone || actor.timezone || this.options.defaultTimezone,
			cronExpression: request.cronExpression?.trim().replace(/\s+/g, ' '),
			intervalMs: request.intervalMs,
			runAt: request.runAt,
			startAt: request.startAt,
			endAt: request.endAt,
			maxRuns: request.maxRuns,
			runCount: 0,
			missedRunPolicy: request.missedRunPolicy ?? 'skip',
			maxCatchUpRuns: request.maxCatchUpRuns ?? this.options.runPolicy.maxCatchUpRuns,
			catchUpWindowMs: request.catchUpWindowMs ?? this.options.runPolicy.catchUpWindowMs,
			concurrencyPolicy: request.concurrencyPolicy ?? 'skipIfRunning',
			retryPolicy: mergeRetryPolicy(this.options.defaultRetryPolicy, request.retryPolicy),
			taskType: request.taskType.trim(),
			taskInput: request.taskInput,
			taskPriority: request.taskPriority ?? 'normal',
			taskTags: request.taskTags ?? [],
			taskMetadata: request.taskMetadata ?? {},
			requiredPermissions: request.requiredPermissions ?? [],
			requiresConfirmation: request.requiresConfirmation ?? false,
			confirmationPolicy: request.confirmationPolicy,
			enabled: request.enabled ?? true,
			createdAt: nowIso,
			updatedAt: nowIso,
			metadata: request.metadata ?? {},
			audit: [],
		};
		schedule.nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
		schedule.audit = [this.audit(schedule, 'schedule.created', 'Schedule created.', actor.source)];

		const created = await this.store.createSchedule(schedule);
		await this.emitEvent({
			scheduleId: created.id,
			type: 'schedule.created',
			userId: created.ownerUserId,
			source: created.source,
			message: 'Schedule created.',
			metadata: this.auditMetadata(created),
		});
		return created;
	}

	async updateSchedule(
		scheduleId: CronScheduleId,
		patch: CronScheduleUpdateRequest,
		actor = this.systemActor()
	): Promise<CronSchedule> {
		const current = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({
			action: 'updateSchedule',
			schedule: current,
			request: patch,
			actor,
		});
		this.accessPolicy.validateFrequency({ request: patch, actor, existingSchedule: current });
		validateScheduleShape(patch, this.options.runPolicy, current);
		assertSafeStoredSchedulePayload(patch);
		const merged: CronSchedule = {
			...current,
			...patch,
			retryPolicy: mergeRetryPolicy(current.retryPolicy, patch.retryPolicy),
			updatedAt: new Date().toISOString(),
			audit: [
				...current.audit,
				this.audit(current, 'schedule.updated', 'Schedule updated.', actor.source),
			],
		};
		merged.nextRunAt = this.calculator.getNextRun(merged, new Date())?.toISOString();
		const updated = await this.store.updateSchedule(scheduleId, merged);
		await this.emitEvent({
			scheduleId,
			type: 'schedule.updated',
			userId: updated.ownerUserId,
			source: updated.source,
			message: 'Schedule updated.',
			metadata: this.auditMetadata(updated),
		});
		return updated;
	}

	async pauseSchedule(scheduleId: CronScheduleId, actor = this.systemActor()): Promise<void> {
		const schedule = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({ action: 'pauseSchedule', schedule, actor });
		const now = new Date().toISOString();
		const updated = await this.store.updateSchedule(scheduleId, {
			status: 'paused',
			pausedAt: now,
			updatedAt: now,
			audit: [
				...schedule.audit,
				this.audit(schedule, 'schedule.paused', 'Schedule paused.', actor.source),
			],
		});
		await this.emitEvent({
			scheduleId,
			type: 'schedule.paused',
			userId: updated.ownerUserId,
			source: updated.source,
			message: 'Schedule paused.',
			metadata: {},
		});
	}

	async resumeSchedule(scheduleId: CronScheduleId, actor = this.systemActor()): Promise<void> {
		const schedule = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({ action: 'resumeSchedule', schedule, actor });
		const now = new Date();
		const nextRunAt = this.calculator
			.getNextRun({ ...schedule, status: 'active', enabled: true, pausedAt: undefined }, now)
			?.toISOString();
		const updated = await this.store.updateSchedule(scheduleId, {
			status: 'active',
			enabled: true,
			pausedAt: undefined,
			nextRunAt,
			updatedAt: now.toISOString(),
			audit: [
				...schedule.audit,
				this.audit(schedule, 'schedule.resumed', 'Schedule resumed.', actor.source),
			],
		});
		await this.emitEvent({
			scheduleId,
			type: 'schedule.resumed',
			userId: updated.ownerUserId,
			source: updated.source,
			message: 'Schedule resumed.',
			metadata: { nextRunAt: nextRunAt ?? null },
		});
	}

	async deleteSchedule(scheduleId: CronScheduleId, actor = this.systemActor()): Promise<void> {
		const schedule = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({ action: 'deleteSchedule', schedule, actor });
		const now = new Date().toISOString();
		await this.store.updateSchedule(scheduleId, {
			status: 'deleted',
			enabled: false,
			deletedAt: now,
			updatedAt: now,
			audit: [
				...schedule.audit,
				this.audit(schedule, 'schedule.deleted', 'Schedule deleted.', actor.source),
			],
		});
		await this.store.deleteSchedule(scheduleId);
		await this.emitEvent({
			scheduleId,
			type: 'schedule.deleted',
			userId: schedule.ownerUserId,
			source: schedule.source,
			message: 'Schedule deleted.',
			metadata: {},
		});
	}

	async getSchedule(scheduleId: CronScheduleId, actor = this.systemActor()): Promise<CronSchedule> {
		const schedule = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({ action: 'listSchedules', schedule, actor });
		return schedule;
	}

	async listSchedules(
		filter: CronScheduleFilter = {},
		actor = this.systemActor()
	): Promise<CronSchedule[]> {
		await this.accessPolicy.authorize({ action: 'listSchedules', actor });
		return this.store.listSchedules({
			...filter,
			ownerUserId: actor.permissions.includes('adminScheduleManagement')
				? filter.ownerUserId
				: (filter.ownerUserId ?? actor.userId),
		});
	}

	async runScheduleNow(
		scheduleId: CronScheduleId,
		actor = this.systemActor()
	): Promise<CronScheduledTask> {
		const schedule = await this.store.getSchedule(scheduleId);
		await this.accessPolicy.authorize({ action: 'runScheduleNow', schedule, actor });
		const task = await this.triggerSchedule(schedule, new Date().toISOString(), false, true);
		if (!task) throw new CronScheduleExecutionError('Schedule did not create a task.');
		return task;
	}

	async computeNextRun(schedule: CronSchedule, from = new Date()): Promise<Date | null> {
		return this.calculator.getNextRun(schedule, from);
	}

	async recoverSchedulesOnStartup(): Promise<void> {
		const now = new Date();
		const schedules = await this.store.listRecoverableSchedules();
		for (const schedule of schedules) {
			try {
				validateScheduleShape(schedule, this.options.runPolicy);
				await this.emitEvent({
					scheduleId: schedule.id,
					type: 'schedule.loaded',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Schedule loaded during startup recovery.',
					metadata: {},
				});

				if (!schedule.nextRunAt) {
					const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
					await this.store.updateSchedule(schedule.id, {
						nextRunAt,
						lastEvaluatedAt: now.toISOString(),
						updatedAt: now.toISOString(),
					});
					continue;
				}

				if (Date.parse(schedule.nextRunAt) <= now.getTime()) {
					await this.handleMissedRun(schedule, now);
				} else {
					await this.store.updateSchedule(schedule.id, { lastEvaluatedAt: now.toISOString() });
				}
			} catch (error) {
				await this.markRecoveryFailed(schedule, error);
			}
		}
	}

	async processDueSchedules(now: Date): Promise<void> {
		const due = (await this.store.listDueSchedules(now)).slice(
			0,
			this.options.runPolicy.maxRunsPerTurn
		);
		for (const schedule of due) {
			await this.triggerSchedule(schedule, schedule.nextRunAt ?? now.toISOString(), false, false);
		}
	}

	async getNextRuns(
		scheduleId: CronScheduleId,
		count: number,
		actor = this.systemActor()
	): Promise<CronNextRunPreview> {
		const schedule = await this.getSchedule(scheduleId, actor);
		const safeCount = Math.max(1, Math.min(count, 20));
		const runs = this.calculator.getNextRuns(schedule, safeCount).map((date) => date.toISOString());
		return {
			scheduleId,
			runs,
			description: this.describer.describeSchedule(schedule),
		};
	}

	private async handleMissedRun(schedule: CronSchedule, now: Date): Promise<void> {
		await this.emitEvent({
			scheduleId: schedule.id,
			type: 'schedule.missed',
			userId: schedule.ownerUserId,
			source: schedule.source,
			message: `Schedule missed run at ${schedule.nextRunAt}.`,
			metadata: { missedRunPolicy: schedule.missedRunPolicy },
		});

		switch (schedule.missedRunPolicy) {
			case 'skip': {
				const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
				await this.store.updateSchedule(schedule.id, {
					nextRunAt,
					lastEvaluatedAt: now.toISOString(),
					updatedAt: now.toISOString(),
				});
				await this.emitEvent({
					scheduleId: schedule.id,
					type: 'schedule.skipped',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Missed run skipped.',
					metadata: { nextRunAt: nextRunAt ?? null },
				});
				return;
			}
			case 'runOnce':
				await this.triggerSchedule(schedule, schedule.nextRunAt ?? now.toISOString(), true, false);
				return;
			case 'catchUp': {
				const limit = Math.min(
					schedule.maxCatchUpRuns ?? this.options.runPolicy.maxCatchUpRuns,
					this.options.runPolicy.maxRunsPerTurn
				);
				const cutoff =
					now.getTime() - (schedule.catchUpWindowMs ?? this.options.runPolicy.catchUpWindowMs);
				const missedRuns = this.calculator
					.getMissedRuns(schedule, now, limit)
					.filter((runAt) => runAt.getTime() >= cutoff);
				for (const runAt of missedRuns) {
					await this.triggerSchedule(schedule, runAt.toISOString(), true, false);
				}
				return;
			}
			case 'fail':
				await this.store.updateSchedule(schedule.id, {
					status: 'failed',
					lastFailedRunAt: now.toISOString(),
					updatedAt: now.toISOString(),
				});
				await this.emitEvent({
					scheduleId: schedule.id,
					type: 'schedule.failed',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Schedule failed because a run was missed.',
					metadata: {},
				});
				return;
			case 'askUser':
				await this.triggerSchedule(schedule, schedule.nextRunAt ?? now.toISOString(), true, false);
				return;
		}
	}

	private async triggerSchedule(
		inputSchedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		manual: boolean
	): Promise<CronScheduledTask | undefined> {
		const locked = await this.store.acquireScheduleLock(
			inputSchedule.id,
			this.options.runnerId,
			this.options.lockTtlMs
		);
		if (!locked) return undefined;

		try {
			const schedule = await this.store.getSchedule(inputSchedule.id);
			if (!manual) assertScheduleCanRun(schedule);

			await this.emitEvent({
				scheduleId: schedule.id,
				type: 'schedule.due',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Schedule is due.',
				metadata: { scheduledRunAt, missedRun },
			});

			const idempotencyKey = this.idempotencyKey(schedule.id, scheduledRunAt);
			const existingExecution = await this.store.getExecutionByIdempotencyKey(idempotencyKey);
			if (existingExecution) {
				await this.emitEvent({
					scheduleId: schedule.id,
					type: 'schedule.skipped',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Duplicate scheduled run ignored.',
					metadata: { idempotencyKey },
				});
				return undefined;
			}

			const existingTask = await this.runner.findExistingTask?.({
				scheduleId: schedule.id,
				scheduledRunAt,
			});
			if (existingTask) {
				await this.recordExecution(
					schedule,
					idempotencyKey,
					scheduledRunAt,
					'duplicateIgnored',
					missedRun,
					{
						taskId: existingTask.id,
					}
				);
				return undefined;
			}

			const concurrencyDecision = await this.applyConcurrencyPolicy(
				schedule,
				scheduledRunAt,
				missedRun
			);
			if (concurrencyDecision === 'skipped') return undefined;

			const task = await this.createTaskWithRetry(
				schedule,
				scheduledRunAt,
				missedRun,
				idempotencyKey
			);
			const updated = await this.updateScheduleAfterTrigger(schedule, scheduledRunAt);
			await this.recordExecution(
				updated,
				idempotencyKey,
				scheduledRunAt,
				'taskCreated',
				missedRun,
				{
					taskId: task.id,
				}
			);
			await this.emitEvent({
				scheduleId: schedule.id,
				type: 'schedule.triggered',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Scheduled task created.',
				metadata: { taskId: task.id, scheduledRunAt, nextRunAt: updated.nextRunAt ?? null },
			});
			return task;
		} catch (error) {
			await this.recordFailure(inputSchedule, scheduledRunAt, missedRun, error);
			this.logger?.error('CronScheduler', `Failed to trigger schedule ${inputSchedule.id}.`, error);
			if (error instanceof CronSchedulerError && !error.retryable) return undefined;
			return undefined;
		} finally {
			await this.store.releaseScheduleLock(inputSchedule.id, this.options.runnerId);
		}
	}

	private async applyConcurrencyPolicy(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean
	): Promise<'proceed' | 'skipped'> {
		const running = await this.runner.listRunningTasks?.(schedule.id);
		if (!running || running.length === 0 || schedule.concurrencyPolicy === 'allowOverlap')
			return 'proceed';

		if (schedule.concurrencyPolicy === 'skipIfRunning') {
			const idempotencyKey = this.idempotencyKey(schedule.id, scheduledRunAt);
			await this.recordExecution(schedule, idempotencyKey, scheduledRunAt, 'skipped', missedRun, {
				reason: 'concurrency',
				runningTaskIds: running.map((task) => task.id),
			});
			const updated = await this.updateScheduleAfterTrigger(schedule, scheduledRunAt);
			await this.emitEvent({
				scheduleId: schedule.id,
				type: 'schedule.skipped',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Skipped because a previous run is still active.',
				metadata: { nextRunAt: updated.nextRunAt ?? null },
			});
			return 'skipped';
		}

		if (['cancelPrevious', 'replacePrevious'].includes(schedule.concurrencyPolicy)) {
			await this.runner.cancelRunningTasks?.(schedule.id, 'Superseded by a newer scheduled run.');
		}

		return 'proceed';
	}

	private async createTaskWithRetry(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		idempotencyKey: string
	): Promise<CronScheduledTask> {
		const maxAttempts = Math.max(1, schedule.retryPolicy.maxAttempts);
		let attempt = 0;
		let lastError: unknown;
		while (attempt < maxAttempts) {
			attempt++;
			try {
				return await this.runner.createTaskForSchedule({
					schedule,
					scheduledRunAt,
					actualTriggeredAt: new Date().toISOString(),
					runNumber: schedule.runCount + 1,
					missedRun,
					idempotencyKey,
					runnerId: this.options.runnerId,
				});
			} catch (error) {
				lastError = error;
				if (attempt >= maxAttempts) break;
				const backoff = Math.min(
					schedule.retryPolicy.maxDelayMs,
					Math.round(
						schedule.retryPolicy.initialDelayMs *
							schedule.retryPolicy.backoffMultiplier ** (attempt - 1)
					)
				);
				await delay(
					schedule.retryPolicy.jitter ? Math.round(backoff * (0.75 + Math.random() * 0.5)) : backoff
				);
			}
		}
		throw new CronScheduleExecutionError('Task creation failed after retry attempts.', {
			error: lastError instanceof Error ? lastError.message : String(lastError),
		});
	}

	private async updateScheduleAfterTrigger(
		schedule: CronSchedule,
		scheduledRunAt: string
	): Promise<CronSchedule> {
		const now = new Date().toISOString();
		const runCount = schedule.runCount + 1;
		const base: CronSchedule = {
			...schedule,
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: now,
		};
		const completed =
			schedule.type === 'oneTime' ||
			(schedule.maxRuns !== undefined && runCount >= schedule.maxRuns);
		const nextRunAt = completed
			? undefined
			: this.calculator.getNextRun(base, new Date(scheduledRunAt))?.toISOString();
		const status = completed ? 'completed' : schedule.status;
		const updated = await this.store.updateSchedule(schedule.id, {
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: now,
			nextRunAt,
			status,
			updatedAt: now,
		});
		if (completed) {
			await this.emitEvent({
				scheduleId: schedule.id,
				type: 'schedule.completed',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Schedule completed.',
				metadata: { runCount },
			});
		}
		return updated;
	}

	private async recordExecution(
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

	private async recordFailure(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		error: unknown
	): Promise<void> {
		const now = new Date().toISOString();
		const idempotencyKey = this.idempotencyKey(schedule.id, scheduledRunAt);
		await this.store.recordExecution({
			executionId: randomUUID(),
			scheduleId: schedule.id,
			idempotencyKey,
			scheduledRunAt,
			triggeredAt: now,
			status: 'taskFailed',
			missedRun,
			runNumber: schedule.runCount + 1,
			failedAt: now,
			error: toCronRecordError(error),
			metadata: {},
		});
		await this.store.updateSchedule(schedule.id, {
			lastFailedRunAt: now,
			updatedAt: now,
		});
		await this.emitEvent({
			scheduleId: schedule.id,
			type: 'schedule.failed',
			userId: schedule.ownerUserId,
			source: schedule.source,
			message: 'Schedule run failed.',
			metadata: { error: toCronRecordError(error).safeUserMessage },
		});
	}

	private async markRecoveryFailed(schedule: CronSchedule, error: unknown): Promise<void> {
		const now = new Date().toISOString();
		await this.store.updateSchedule(schedule.id, {
			status: 'failed',
			lastFailedRunAt: now,
			updatedAt: now,
		});
		await this.emitEvent({
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

	private idempotencyKey(scheduleId: CronScheduleId, scheduledRunAt: string): string {
		return `cron:${scheduleId}:${new Date(scheduledRunAt).toISOString()}`;
	}

	private systemActor(userId?: string): CronActorContext {
		return {
			source: 'system',
			userId,
			timezone: this.options.defaultTimezone,
			permissions: ['adminScheduleManagement'],
		};
	}

	private audit(
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

	private async emitEvent(input: Omit<CronScheduleEvent, 'eventId' | 'timestamp'>): Promise<void> {
		if (input.scheduleId === 'pending') {
			this.eventBus.emit({
				...input,
				eventId: randomUUID(),
				timestamp: new Date().toISOString(),
			});
			return;
		}
		const event: CronScheduleEvent = {
			...input,
			eventId: randomUUID(),
			timestamp: new Date().toISOString(),
		};
		await this.store.appendScheduleEvent(event);
		this.eventBus.emit(event);
	}

	private auditMetadata(schedule: CronSchedule): CronJsonObject {
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
