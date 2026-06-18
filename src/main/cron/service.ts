import { randomUUID } from 'node:crypto';
import { Inject, Service } from 'typedi';
import { LoggerService } from '../shared';
import type {
	CronActorContext,
	CronJobInfo,
	CronJsonObject,
	CronLogger,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleEventType,
	CronScheduleFilter,
	CronScheduledTask,
	CronServiceOptions,
} from './types';
import { CronNextRunCalculator } from './calculator';
import { isActiveSchedule } from './core';
import { ElectronCronStore } from './store';
import { DEFAULT_CRON_RETRY_POLICY, DEFAULT_TIMEZONE, POLL_INTERVAL_MS, defaultCronEnabled } from './constants';

export type { CronServiceOptions, CronServiceActor } from './types';

type CronEventListener = (event: CronScheduleEvent) => void;

export interface CronServiceEvents {
	subscribe(listener: CronEventListener): () => void;
}

@Service()
export class CronService {
	@Inject(() => LoggerService)
	private readonly logger!: CronLogger;

	private readonly store = new ElectronCronStore();
	private readonly calculator = new CronNextRunCalculator();
	private readonly listeners = new Set<CronEventListener>();
	private readonly enabled: boolean;
	private timer: NodeJS.Timeout | undefined;

	constructor(options: CronServiceOptions = {}) {
		this.enabled = options.enabled ?? this.store.isEnabled(defaultCronEnabled());
		this.store.setEnabled(this.enabled);
	}

	get events(): CronServiceEvents {
		return {
			subscribe: (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			},
		};
	}

	async start(): Promise<void> {
		if (!this.enabled) {
			this.logger.warn('CronService', 'Cron automatic execution is globally disabled.');
			return;
		}
		this.recover(new Date());
		this.timer = setInterval(() => {
			try {
				this.processDue(new Date());
			} catch (error) {
				this.logger.error('CronService', 'Failed to process due schedules.', error);
			}
		}, POLL_INTERVAL_MS);
		this.timer.unref?.();
		this.logger.info('CronService', 'Cron service started.');
	}

	async stop(): Promise<void> {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	destroy(): void {
		void this.stop();
		this.logger.info('CronService', 'Disposed');
	}

	createSchedule(request: CronScheduleCreateRequest, actor?: CronActorContext): CronSchedule {
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
			ownerUserId: request.ownerUserId ?? actor?.userId,
			sessionId: request.sessionId ?? actor?.sessionId,
			createdBy: request.createdBy,
			visibility: request.visibility ?? 'user',
			timezone: request.timezone || actor?.timezone || DEFAULT_TIMEZONE,
			cronExpression: request.cronExpression?.trim().replace(/\s+/g, ' '),
			intervalMs: request.intervalMs,
			runAt: request.runAt,
			startAt: request.startAt,
			endAt: request.endAt,
			maxRuns: request.maxRuns,
			runCount: 0,
			missedRunPolicy: request.missedRunPolicy ?? 'skip',
			concurrencyPolicy: request.concurrencyPolicy ?? 'skipIfRunning',
			retryPolicy: { ...DEFAULT_CRON_RETRY_POLICY, ...(request.retryPolicy ?? {}) },
			providerId: request.providerId,
			modelId: request.modelId,
			target: request.target,
			payload: request.payload,
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
		const created = this.store.create(schedule);
		this.emit(created, 'schedule.created', 'Schedule created.');
		return created;
	}

	pauseSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const now = new Date().toISOString();
		const updated = this.store.update(scheduleId, { status: 'paused', pausedAt: now, updatedAt: now });
		this.emit(updated, 'schedule.paused', 'Schedule paused.');
	}

	resumeSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const schedule = this.store.require(scheduleId);
		const now = new Date();
		const nextRunAt = this.calculator
			.getNextRun({ ...schedule, status: 'active', enabled: true, pausedAt: undefined }, now)
			?.toISOString();
		const updated = this.store.update(scheduleId, {
			status: 'active',
			enabled: true,
			pausedAt: undefined,
			nextRunAt,
			updatedAt: now.toISOString(),
		});
		this.emit(updated, 'schedule.resumed', 'Schedule resumed.');
	}

	deleteSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const now = new Date().toISOString();
		const updated = this.store.update(scheduleId, {
			status: 'deleted',
			enabled: false,
			deletedAt: now,
			updatedAt: now,
		});
		this.emit(updated, 'schedule.deleted', 'Schedule deleted.');
	}

	getSchedule(scheduleId: string, _actor?: CronActorContext): CronSchedule {
		return this.store.require(scheduleId);
	}

	listSchedules(filter: CronScheduleFilter = {}, _actor?: CronActorContext): CronSchedule[] {
		return this.store.list(filter);
	}

	runScheduleNow(scheduleId: string, _actor?: CronActorContext): CronScheduledTask {
		const schedule = this.store.require(scheduleId);
		return this.trigger(schedule, new Date().toISOString());
	}

	listJobs(): CronJobInfo[] {
		return [];
	}

	deleteJob(_id: string): void {}

	private recover(now: Date): void {
		for (const schedule of this.store.list().filter(isActiveSchedule)) {
			if (!schedule.nextRunAt) {
				const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
				this.store.update(schedule.id, { nextRunAt, lastEvaluatedAt: now.toISOString() });
			} else if (Date.parse(schedule.nextRunAt) <= now.getTime()) {
				const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
				this.store.update(schedule.id, { nextRunAt, lastEvaluatedAt: now.toISOString() });
			}
		}
	}

	private processDue(now: Date): void {
		const due = this.store.list()
			.filter(isActiveSchedule)
			.filter((schedule) => Boolean(schedule.nextRunAt && Date.parse(schedule.nextRunAt) <= now.getTime()));
		for (const schedule of due) {
			this.trigger(schedule, schedule.nextRunAt ?? now.toISOString());
		}
	}

	private trigger(schedule: CronSchedule, scheduledRunAt: string): CronScheduledTask {
		const task = this.buildTask(schedule, scheduledRunAt);
		const now = new Date().toISOString();
		const runCount = schedule.runCount + 1;
		const completed =
			schedule.type === 'oneTime' || (schedule.maxRuns !== undefined && runCount >= schedule.maxRuns);
		const nextRunAt = completed
			? undefined
			: this.calculator
					.getNextRun({ ...schedule, runCount, lastRunAt: scheduledRunAt }, new Date(scheduledRunAt))
					?.toISOString();
		const updated = this.store.update(schedule.id, {
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: now,
			nextRunAt,
			status: completed ? 'completed' : schedule.status,
			updatedAt: now,
		});
		this.emit(updated, 'schedule.triggered', 'Scheduled task created.', {
			taskId: task.id,
			scheduledRunAt,
			nextRunAt: updated.nextRunAt ?? null,
		});
		if (completed) this.emit(updated, 'schedule.completed', 'Schedule completed.', { runCount });
		return task;
	}

	private buildTask(schedule: CronSchedule, scheduledRunAt: string): CronScheduledTask {
		const now = new Date().toISOString();
		return {
			id: randomUUID(),
			type: schedule.taskType,
			title: schedule.name,
			description: schedule.description,
			source: 'cron',
			sourceId: schedule.id,
			userId: schedule.ownerUserId,
			sessionId: schedule.sessionId,
			input: schedule.taskInput,
			status: 'queued',
			priority: schedule.taskPriority,
			visibility: schedule.visibility,
			tags: ['cron', ...schedule.taskTags],
			metadata: {
				...schedule.taskMetadata,
				cronScheduleId: schedule.id,
				scheduledRunAt,
				runNumber: schedule.runCount + 1,
			},
			createdAt: now,
			updatedAt: now,
		};
	}

	private emit(
		schedule: CronSchedule,
		type: CronScheduleEventType,
		message: string,
		metadata: CronJsonObject = {}
	): void {
		const event: CronScheduleEvent = {
			eventId: randomUUID(),
			scheduleId: schedule.id,
			type,
			userId: schedule.ownerUserId,
			source: schedule.source,
			timestamp: new Date().toISOString(),
			message,
			metadata,
		};
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				this.logger.error('CronService', 'Cron event listener failed.', error);
			}
		}
	}

	private setStoredEnabled(enabled: boolean): void {
		this.writeState((state) => {
			state.enabled = enabled;
		});
	}

	private listStored(filter: CronScheduleFilter = {}): CronSchedule[] {
		const schedules = this.readState()
			.schedules.filter((schedule) => filter.includeDeleted || schedule.status !== 'deleted')
			.filter((schedule) => matchesValue(schedule.status, filter.status))
			.filter((schedule) => matchesValue(schedule.source, filter.source))
			.filter((schedule) => !filter.sourceId || schedule.sourceId === filter.sourceId)
			.filter((schedule) => !filter.ownerUserId || schedule.ownerUserId === filter.ownerUserId)
			.filter((schedule) => !filter.sessionId || schedule.sessionId === filter.sessionId)
			.filter((schedule) => matchesValue(schedule.visibility, filter.visibility))
			.filter((schedule) => !filter.taskType || schedule.taskType === filter.taskType)
			.filter((schedule) => !filter.tag || schedule.taskTags.includes(filter.tag))
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
		return clone(typeof filter.limit === 'number' ? schedules.slice(0, filter.limit) : schedules);
	}

	private findStored(scheduleId: CronScheduleId): CronSchedule | undefined {
		const schedule = this.readState().schedules.find((entry) => entry.id === scheduleId);
		return schedule ? clone(schedule) : undefined;
	}

	private createStored(schedule: CronSchedule): CronSchedule {
		return this.writeState((state) => {
			state.schedules.push(clone(schedule));
			return clone(schedule);
		});
	}

	private updateStored(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): CronSchedule {
		return this.writeState((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
			const current = state.schedules[index]!;
			const next: CronSchedule = {
				...current,
				...clone(patch),
				id: current.id,
				metadata: { ...current.metadata, ...(patch.metadata ?? {}) },
				taskMetadata: { ...current.taskMetadata, ...(patch.taskMetadata ?? {}) },
			};
			state.schedules[index] = next;
			return clone(next);
		});
	}

	private readState(): PersistedCronState {
		return this.store.store;
	}

	private writeState<T>(mutate: (state: PersistedCronState) => T): T {
		const state = this.readState();
		const result = mutate(state);
		this.store.store = state;
		return result;
	}
}
