import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import cron, { type ScheduledTask } from 'node-cron';
import { Inject, Service } from 'typedi';
import { LoggerService } from '../shared';
import { CronTool } from '../agent/tools/automation/cron';
import {
	CRON_FUNCTIONS,
	CRON_FUNCTION_SCHEMAS,
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
	private readonly tasks = new Map<CronScheduleId, ScheduledTask>();
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
		const created = this.create(schedule);
		this.emit(created, 'schedule.created', 'Schedule created.');
		return created;
	}

	pauseSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const now = new Date().toISOString();
		const updated = this.update(scheduleId, { status: 'paused', pausedAt: now, updatedAt: now });
		this.emit(updated, 'schedule.paused', 'Schedule paused.');
	}

	resumeSchedule(scheduleId: string, _actor?: CronActorContext): void {
		const schedule = this.require(scheduleId);
		const now = new Date();
		const nextRunAt = this.calculator
			.getNextRun({ ...schedule, status: 'active', enabled: true, pausedAt: undefined }, now)
			?.toISOString();
		const updated = this.update(scheduleId, {
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
		const updated = this.update(scheduleId, {
			status: 'deleted',
			enabled: false,
			deletedAt: now,
			updatedAt: now,
		});
		this.emit(updated, 'schedule.deleted', 'Schedule deleted.');
	}

	getSchedule(scheduleId: string, _actor?: CronActorContext): CronSchedule {
		return this.require(scheduleId);
	}

	listSchedules(filter: CronScheduleFilter = {}, _actor?: CronActorContext): CronSchedule[] {
		return this.list(filter);
	}

	runScheduleNow(scheduleId: string, _actor?: CronActorContext): CronScheduledTask {
		const schedule = this.require(scheduleId);
		return this.trigger(schedule, new Date().toISOString());
	}

	get tools(): CronTool[] {
		return CRON_FUNCTIONS.map(
			(fn) =>
				new CronTool(this, {
					id: fn.id,
					description: fn.description,
					schema: CRON_FUNCTION_SCHEMAS[fn.id],
				})
		);
	}

	invoke<K extends CronFunctionId>(
		id: K,
		input: CronFunctionInput[K],
		actor?: CronActorContext
	): CronFunctionResult[K] {
		const definition = CRON_FUNCTIONS.find((fn) => fn.id === id);
		if (!definition) throw new Error(`Unknown cron function: ${id}`);
		return this.handlers[id](input, actor);
	}

	listJobs(): CronJobInfo[] {
		return [];
	}

	deleteJob(_id: string): void {}

	private recover(now: Date): void {
		for (const schedule of this.list().filter(isActiveSchedule)) {
			if (!schedule.nextRunAt) {
				const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
				this.update(schedule.id, { nextRunAt, lastEvaluatedAt: now.toISOString() });
			} else if (Date.parse(schedule.nextRunAt) <= now.getTime()) {
				const nextRunAt = this.calculator.getNextRun(schedule, now)?.toISOString();
				this.update(schedule.id, { nextRunAt, lastEvaluatedAt: now.toISOString() });
			}
		}
	}

	private processDue(now: Date): void {
		const due = this.list()
			.filter(isActiveSchedule)
			.filter((schedule) => Boolean(schedule.nextRunAt && Date.parse(schedule.nextRunAt) <= now.getTime()));
		for (const schedule of due) {
			this.trigger(schedule, schedule.nextRunAt ?? now.toISOString());
		}
	}

	private trigger(schedule: CronSchedule, scheduledRunAt: string): CronScheduledTask {
		console.log('[CronService] Schedule triggered', {
			scheduleId: schedule.id,
			name: schedule.name,
			scheduledRunAt,
		});
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
		const updated = this.update(schedule.id, {
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
