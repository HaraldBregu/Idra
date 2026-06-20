import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import cron from 'node-cron';
import { Inject, Service } from 'typedi';
import { LoggerService } from '../shared';
import {
	CRON_STORE_DIRECTORY,
	CRON_STORE_FILE_NAME,
	DEFAULT_CRON_RETRY_POLICY,
	DEFAULT_TIMEZONE,
	clone,
	defaultCronEnabled,
	isActiveSchedule,
	matchesValue,
} from './core';
import { AgentService } from '../agent/service';
import type {
	CronActorContext,
	CronFunctionId,
	CronFunctionInput,
	CronFunctionResult,
	CronJobInfo,
	CronJsonObject,
	CronLogger,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleEventType,
	CronScheduleFilter,
	CronScheduleId,
	CronScheduledTask,
	CronServiceOptions,
	PersistedCronState,
} from './core';

export type { CronServiceOptions, CronServiceActor } from './core';

type CronEventListener = (event: CronScheduleEvent) => void;

interface CronJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}

export interface CronServiceEvents {
	subscribe(listener: CronEventListener): () => void;
}

@Service()
export class CronService {
	@Inject(() => LoggerService)
	private readonly logger!: CronLogger;

	@Inject(() => AgentService)
	private readonly agentService!: AgentService;

	private readonly store: Store<PersistedCronState>;
	private readonly tasks = new Map<CronScheduleId, CronJobHandle>();
	private readonly listeners = new Set<CronEventListener>();
	private readonly enabled: boolean;

	private readonly handlers: {
		[K in CronFunctionId]: (input: CronFunctionInput[K], actor?: CronActorContext) => CronFunctionResult[K];
	} = {
		create_schedule: (input, actor) => this.createSchedule(input.request, actor),
		pause_schedule: (input, actor) => this.pauseSchedule(input.scheduleId, actor),
		resume_schedule: (input, actor) => this.resumeSchedule(input.scheduleId, actor),
		delete_schedule: (input, actor) => this.deleteSchedule(input.scheduleId, actor),
		get_schedule: (input, actor) => this.getSchedule(input.scheduleId, actor),
		list_schedules: (input, actor) => this.listSchedules(input.filter, actor),
		run_schedule_now: (input, actor) => this.runScheduleNow(input.scheduleId, actor),
	};

	constructor(options: CronServiceOptions = {}) {
		this.store = new Store<PersistedCronState>({
			name: CRON_STORE_FILE_NAME,
			cwd: CRON_STORE_DIRECTORY,
			accessPropertiesByDotNotation: false,
			defaults: { schedules: [] },
		});
		this.enabled = options.enabled ?? this.readState().enabled ?? defaultCronEnabled();
		this.writeState((state) => {
			state.enabled = this.enabled;
		});
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
		for (const schedule of this.list().filter(isActiveSchedule)) {
			this.activate(schedule);
		}
		this.logger.info('CronService', 'Cron service started.');
	}

	async stop(): Promise<void> {
		for (const task of this.tasks.values()) task.stop();
		this.tasks.clear();
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
		const created = this.activate(this.create(schedule));
		this.emit(created, 'schedule.created', 'Schedule created.');
		return created;
	}

	pauseSchedule(scheduleId: string, _actor?: CronActorContext): void {
		this.unscheduleJob(scheduleId);
		const now = new Date().toISOString();
		const updated = this.update(scheduleId, {
			status: 'paused',
			pausedAt: now,
			nextRunAt: undefined,
			updatedAt: now,
		});
		this.emit(updated, 'schedule.paused', 'Schedule paused.');
	}

	resumeSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const now = new Date().toISOString();
		const updated = this.activate(
			this.update(scheduleId, {
				status: 'active',
				enabled: true,
				pausedAt: undefined,
				updatedAt: now,
			})
		);
		this.emit(updated, 'schedule.resumed', 'Schedule resumed.');
	}

	deleteSchedule(scheduleId: string, _actor?: CronActorContext): void {
		this.unscheduleJob(scheduleId);
		const removed = this.remove(scheduleId);
		this.emit(removed, 'schedule.deleted', 'Schedule deleted.');
	}

	getSchedule(scheduleId: string, _actor?: CronActorContext): CronSchedule {
		return this.require(scheduleId);
	}

	listSchedules(filter: CronScheduleFilter = {}, _actor?: CronActorContext): CronSchedule[] {
		return this.list(filter);
	}

	runScheduleNow(scheduleId: string, _actor?: CronActorContext): CronScheduledTask {
		return this.trigger(scheduleId);
	}

	invoke<K extends CronFunctionId>(
		id: K,
		input: CronFunctionInput[K],
		actor?: CronActorContext
	): CronFunctionResult[K] {
		const handler = this.handlers[id];
		if (!handler) throw new Error(`Unknown cron function: ${id}`);
		return handler(input, actor);
	}

	listJobs(): CronJobInfo[] {
		return [];
	}

	deleteJob(_id: string): void {}

	private activate(schedule: CronSchedule): CronSchedule {
		if (!isActiveSchedule(schedule)) return schedule;
		this.scheduleJob(schedule);
		const nextRunAt = this.tasks.get(schedule.id)?.getNextRun()?.toISOString();
		return nextRunAt ? this.update(schedule.id, { nextRunAt }) : schedule;
	}

	private scheduleJob(schedule: CronSchedule): void {
		this.unscheduleJob(schedule.id);
		const handle = this.createJob(schedule);
		if (handle) this.tasks.set(schedule.id, handle);
	}

	private createJob(schedule: CronSchedule): CronJobHandle | undefined {
		switch (schedule.type) {
			case 'cron':
				return this.createCronJob(schedule);
			case 'interval':
			case 'fixedRate':
			case 'fixedDelay':
				return this.createIntervalJob(schedule);
			case 'oneTime':
				return this.createOneTimeJob(schedule);
			default:
				this.logger.warn(
					'CronService',
					`Schedule ${schedule.id} skipped: schedule type "${schedule.type}" is not supported.`
				);
				return undefined;
		}
	}

	private createCronJob(schedule: CronSchedule): CronJobHandle | undefined {
		if (!schedule.cronExpression || !cron.validate(schedule.cronExpression)) {
			this.logger.warn(
				'CronService',
				`Schedule ${schedule.id} has an invalid cron expression: ${schedule.cronExpression}`
			);
			return undefined;
		}
		const task = cron.schedule(schedule.cronExpression, () => this.trigger(schedule.id), {
			name: schedule.id,
			timezone: schedule.timezone,
			maxExecutions: schedule.maxRuns,
		});
		return { stop: () => task.destroy(), getNextRun: () => task.getNextRun() };
	}

	private createIntervalJob(schedule: CronSchedule): CronJobHandle | undefined {
		const intervalMs = schedule.intervalMs;
		if (!intervalMs || intervalMs <= 0) {
			this.logger.warn(
				'CronService',
				`Schedule ${schedule.id} skipped: a positive intervalMs is required for ${schedule.type} schedules.`
			);
			return undefined;
		}
		const timer = setInterval(() => this.trigger(schedule.id), intervalMs);
		return {
			stop: () => clearInterval(timer),
			getNextRun: () => new Date(Date.now() + intervalMs),
		};
	}

	private createOneTimeJob(schedule: CronSchedule): CronJobHandle | undefined {
		const runAt = schedule.runAt ? Date.parse(schedule.runAt) : Number.NaN;
		if (Number.isNaN(runAt)) {
			this.logger.warn(
				'CronService',
				`Schedule ${schedule.id} skipped: a valid runAt timestamp is required for oneTime schedules.`
			);
			return undefined;
		}
		const timer = setTimeout(() => this.trigger(schedule.id), Math.max(0, runAt - Date.now()));
		return { stop: () => clearTimeout(timer), getNextRun: () => new Date(runAt) };
	}

	private unscheduleJob(scheduleId: CronScheduleId): void {
		const task = this.tasks.get(scheduleId);
		if (!task) return;
		task.stop();
		this.tasks.delete(scheduleId);
	}

	private trigger(scheduleId: CronScheduleId): CronScheduledTask {
		const schedule = this.require(scheduleId);
		const scheduledRunAt = new Date().toISOString();
		console.log('[CronService] Schedule triggered', {
			scheduleId: schedule.id,
			name: schedule.name,
			scheduledRunAt,
			schedule
		});
		const task = this.buildTask(schedule, scheduledRunAt);
		this.runTask(schedule, task);
		const runCount = schedule.runCount + 1;
		const completed = schedule.maxRuns !== undefined && runCount >= schedule.maxRuns;
		if (completed) this.unscheduleJob(schedule.id);
		const updated = this.update(schedule.id, {
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: scheduledRunAt,
			nextRunAt: completed ? undefined : this.tasks.get(schedule.id)?.getNextRun()?.toISOString(),
			status: completed ? 'completed' : schedule.status,
			updatedAt: scheduledRunAt,
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

	private list(filter: CronScheduleFilter = {}): CronSchedule[] {
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

	private require(scheduleId: CronScheduleId): CronSchedule {
		const schedule = this.readState().schedules.find((entry) => entry.id === scheduleId);
		if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
		return clone(schedule);
	}

	private create(schedule: CronSchedule): CronSchedule {
		return this.writeState((state) => {
			state.schedules.push(clone(schedule));
			return clone(schedule);
		});
	}

	private remove(scheduleId: CronScheduleId): CronSchedule {
		return this.writeState((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
			const [removed] = state.schedules.splice(index, 1);
			return clone(removed!);
		});
	}

	private update(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): CronSchedule {
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
