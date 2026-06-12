import { randomUUID } from 'node:crypto';
import type {
	CronActorContext,
	CronNextRunPreview,
	CronSchedule,
	CronScheduleAccessPolicy,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronScheduleId,
	CronScheduler,
	CronSchedulerOptions,
	CronScheduleRunner,
	CronScheduleUpdateRequest,
	CronScheduleStore,
	CronScheduledTask,
} from './core/types';
import type { CronLogger } from './core/logger';
import { ScheduleDescriber } from './core/describer';
import {
	CronScheduleExecutionError,
} from './core/errors';
import { CronScheduleEventRecorder } from './core/events';
import { assertSafeStoredSchedulePayload } from './core/payload';
import { mergeRetryPolicy } from './core/retry';
import { CronScheduleRunRecorder } from './core/recording';
import { CronScheduleTrigger } from './core/trigger';
import { validateScheduleShape } from './core/validation';
import { CronNextRunCalculator } from './calculator';
import { CronScheduleEventBus } from './support';
import {
	DEFAULT_CRON_RETRY_POLICY,
	DEFAULT_CRON_RUN_POLICY,
	DEFAULT_CRON_SCHEDULER_OPTIONS,
} from './constants';

export {
	DEFAULT_CRON_RETRY_POLICY,
	DEFAULT_CRON_RUN_POLICY,
	DEFAULT_CRON_SCHEDULER_OPTIONS,
} from './constants';

export class CronSchedulerEngine implements CronScheduler {
	private readonly options: CronSchedulerOptions;
	private readonly calculator: CronNextRunCalculator;
	private readonly describer: ScheduleDescriber;
	private readonly eventBus: CronScheduleEventBus;
	private readonly eventRecorder: CronScheduleEventRecorder;
	private readonly runRecorder: CronScheduleRunRecorder;
	private readonly trigger: CronScheduleTrigger;
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
		this.eventRecorder = new CronScheduleEventRecorder(this.store, this.eventBus);
		this.runRecorder = new CronScheduleRunRecorder(this.store, this.eventRecorder);
		this.trigger = new CronScheduleTrigger(
			this.store,
			this.runner,
			this.calculator,
			this.eventRecorder,
			this.runRecorder,
			{
				runnerId: this.options.runnerId,
				lockTtlMs: this.options.lockTtlMs,
			},
			this.logger
		);
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
			taskType: request.taskType,
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
		schedule.audit = [
			this.eventRecorder.audit(schedule, 'schedule.created', 'Schedule created.', actor.source),
		];

		const created = await this.store.createSchedule(schedule);
		await this.eventRecorder.emit({
			scheduleId: created.id,
			type: 'schedule.created',
			userId: created.ownerUserId,
			source: created.source,
			message: 'Schedule created.',
			metadata: this.eventRecorder.auditMetadata(created),
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
				this.eventRecorder.audit(current, 'schedule.updated', 'Schedule updated.', actor.source),
			],
		};
		merged.nextRunAt = this.calculator.getNextRun(merged, new Date())?.toISOString();
		const updated = await this.store.updateSchedule(scheduleId, merged);
		await this.eventRecorder.emit({
			scheduleId,
			type: 'schedule.updated',
			userId: updated.ownerUserId,
			source: updated.source,
			message: 'Schedule updated.',
			metadata: this.eventRecorder.auditMetadata(updated),
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
				this.eventRecorder.audit(schedule, 'schedule.paused', 'Schedule paused.', actor.source),
			],
		});
		await this.eventRecorder.emit({
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
				this.eventRecorder.audit(schedule, 'schedule.resumed', 'Schedule resumed.', actor.source),
			],
		});
		await this.eventRecorder.emit({
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
				this.eventRecorder.audit(schedule, 'schedule.deleted', 'Schedule deleted.', actor.source),
			],
		});
		await this.store.deleteSchedule(scheduleId);
		await this.eventRecorder.emit({
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
		const task = await this.trigger.trigger(schedule, new Date().toISOString(), false, true);
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
					await this.eventRecorder.emit({
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
					await this.runRecorder.markRecoveryFailed(schedule, error);
				}
			}
		}

	async processDueSchedules(now: Date): Promise<void> {
		const due = (await this.store.listDueSchedules(now)).slice(
			0,
			this.options.runPolicy.maxRunsPerTurn
		);
		for (const schedule of due) {
			await this.trigger.trigger(schedule, schedule.nextRunAt ?? now.toISOString(), false, false);
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
		await this.eventRecorder.emit({
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
				await this.eventRecorder.emit({
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
				await this.trigger.trigger(schedule, schedule.nextRunAt ?? now.toISOString(), true, false);
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
					await this.trigger.trigger(schedule, runAt.toISOString(), true, false);
				}
				return;
			}
			case 'fail':
				await this.store.updateSchedule(schedule.id, {
					status: 'failed',
					lastFailedRunAt: now.toISOString(),
					updatedAt: now.toISOString(),
				});
				await this.eventRecorder.emit({
					scheduleId: schedule.id,
					type: 'schedule.failed',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Schedule failed because a run was missed.',
					metadata: {},
				});
				return;
			case 'askUser':
				await this.trigger.trigger(schedule, schedule.nextRunAt ?? now.toISOString(), true, false);
				return;
		}
	}

	private systemActor(userId?: string): CronActorContext {
		return {
			source: 'system',
			userId,
			timezone: this.options.defaultTimezone,
			permissions: ['adminScheduleManagement'],
		};
	}
}
