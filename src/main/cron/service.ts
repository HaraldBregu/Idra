import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import cron from 'node-cron';
import { Service } from 'typedi';
import {
	clone,
	isActiveSchedule,
	CRON_STORE_FILE_NAME,
	CRON_STORE_DIRECTORY,
	defaultCronEnabled,
} from './util';
import type {
	CronFunctionId,
	CronFunctionInput,
	CronFunctionResult,
	CronJobInfo,
	CronJsonObject,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduledTask,
	CronScheduleEvent,
	CronScheduleEventType,
	CronScheduleFilter,
	PersistedCronState,
} from './types';

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
	private readonly store: Store<PersistedCronState>;
	private readonly tasks = new Map<string, CronJobHandle>();
	private readonly listeners = new Set<CronEventListener>();
	private readonly enabled: boolean;

	private readonly handlers: {
		[K in CronFunctionId]: (input: CronFunctionInput[K]) => CronFunctionResult[K];
	} = {
		create_schedule: (input) => this.createSchedule(input.request),
		pause_schedule: (input) => this.pauseSchedule(input.scheduleId),
		resume_schedule: (input) => this.resumeSchedule(input.scheduleId),
		delete_schedule: (input) => this.deleteSchedule(input.scheduleId),
		get_schedule: (input) => this.getSchedule(input.scheduleId),
		list_schedules: (input) => this.listSchedules(input.filter),
		run_schedule_now: (input) => this.runScheduleNow(input.scheduleId),
	};

	constructor(options: { enabled?: boolean } = {}) {
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
			console.warn('[CronService]', 'Cron automatic execution is globally disabled.');
			return;
		}
		this.reconcile();
		for (const schedule of this.list().filter(isActiveSchedule)) {
			this.activate(schedule);
		}
		console.info('[CronService]', 'Cron service started.');
	}

	async stop(): Promise<void> {
		for (const task of this.tasks.values()) task.stop();
		this.tasks.clear();
	}

	destroy(): void {
		void this.stop();
		console.info('[CronService]', 'Disposed');
	}

	createSchedule(request: CronScheduleCreateRequest): CronSchedule {
		const now = new Date();
		const nowIso = now.toISOString();
		const schedule: CronSchedule = {
			id: randomUUID(),
			name: request.name.trim(),
			description: request.description?.trim(),
			sessionId: request.sessionId,
			cronExpression: request.cronExpression?.trim().replace(/\s+/g, ' '),
			target: request.target,
			taskType: request.taskType,
			enabled: request.enabled ?? true,
			updatedAt: nowIso,
		};
		const created = this.activate(this.create(schedule));
		this.emit(created, 'schedule.created', 'Schedule created.');
		return created;
	}

	pauseSchedule(scheduleId: string): void {
		this.unscheduleJob(scheduleId);
		const now = new Date().toISOString();
		const updated = this.update(scheduleId, {
			enabled: false,
			updatedAt: now,
		});
		this.emit(updated, 'schedule.paused', 'Schedule paused.');
	}

	resumeSchedule(scheduleId: string): void {
		const now = new Date().toISOString();
		const updated = this.activate(
			this.update(scheduleId, {
				enabled: true,
				updatedAt: now,
			})
		);
		this.emit(updated, 'schedule.resumed', 'Schedule resumed.');
	}

	deleteSchedule(scheduleId: string): void {
		this.unscheduleJob(scheduleId);
		const removed = this.remove(scheduleId);
		this.emit(removed, 'schedule.deleted', 'Schedule deleted.');
	}

	getSchedule(scheduleId: string): CronSchedule {
		return this.require(scheduleId);
	}

	listSchedules(filter: CronScheduleFilter = {}): CronSchedule[] {
		return this.list(filter);
	}

	runScheduleNow(scheduleId: string): CronScheduledTask {
		return this.trigger(scheduleId);
	}

	invoke<K extends CronFunctionId>(id: K, input: CronFunctionInput[K]): CronFunctionResult[K] {
		const handler = this.handlers[id];
		if (!handler) throw new Error(`Unknown cron function: ${id}`);
		return handler(input);
	}

	listJobs(): CronJobInfo[] {
		return [];
	}

	deleteJob(_id: string): void {}

	private activate(schedule: CronSchedule): CronSchedule {
		if (!isActiveSchedule(schedule)) return schedule;
		this.scheduleJob(schedule);
		return schedule;
	}

	private scheduleJob(schedule: CronSchedule): void {
		this.unscheduleJob(schedule.id);
		const handle = this.createJob(schedule);
		if (handle) this.tasks.set(schedule.id, handle);
	}

	private createJob(schedule: CronSchedule): CronJobHandle | undefined {
		if (schedule.cronExpression) return this.createCronJob(schedule);
		console.warn('[CronService]', `Schedule ${schedule.id} skipped: no cronExpression provided.`);
		return undefined;
	}

	private createCronJob(schedule: CronSchedule): CronJobHandle | undefined {
		if (!schedule.cronExpression || !cron.validate(schedule.cronExpression)) {
			console.warn(
				'[CronService]',
				`Schedule ${schedule.id} has an invalid cron expression: ${schedule.cronExpression}`
			);
			return undefined;
		}
		const task = cron.schedule(schedule.cronExpression, () => this.fire(schedule.id), {
			name: schedule.id,
		});
		return { stop: () => task.destroy(), getNextRun: () => task.getNextRun() };
	}

	private unscheduleJob(scheduleId: string): void {
		const task = this.tasks.get(scheduleId);
		if (task) {
			task.stop();
			this.tasks.delete(scheduleId);
		}
		for (const cronTask of cron.getTasks().values()) {
			if (cronTask.name === scheduleId) void cronTask.destroy();
		}
	}

	private fire(scheduleId: string): void {
		if (!this.exists(scheduleId)) {
			console.warn(
				'[CronService]',
				`Orphaned cron job removed: schedule ${scheduleId} no longer exists.`
			);
			this.unscheduleJob(scheduleId);
			return;
		}
		this.trigger(scheduleId);
	}

	private reconcile(): void {
		const active = new Set(this.list().filter(isActiveSchedule).map((schedule) => schedule.id));
		for (const task of cron.getTasks().values()) {
			if (task.name && !active.has(task.name)) {
				console.warn('[CronService]', `Destroying orphaned cron job ${task.name}.`);
				void task.destroy();
			}
		}
	}

	private trigger(scheduleId: string): CronScheduledTask {
		const schedule = this.require(scheduleId);
		const scheduledRunAt = new Date().toISOString();
		const task = this.buildTask(schedule, scheduledRunAt);
		this.emit(schedule, 'schedule.triggered', 'Scheduled task created.', {
			taskId: task.id,
			scheduledRunAt,
		});
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
			sessionId: schedule.sessionId,
			input: null,
			status: 'queued',
			priority: 'normal',
			visibility: 'user',
			tags: ['cron'],
			metadata: {
				cronScheduleId: schedule.id,
				scheduledRunAt,
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
			timestamp: new Date().toISOString(),
			message,
			metadata,
		};
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				console.error('[CronService]', 'Cron event listener failed.', error);
			}
		}
	}

	private list(filter: CronScheduleFilter = {}): CronSchedule[] {
		const schedules = this.readState()
			.schedules.filter((schedule) => !filter.sessionId || schedule.sessionId === filter.sessionId)
			.filter((schedule) => !filter.taskType || schedule.taskType === filter.taskType)
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
		return clone(typeof filter.limit === 'number' ? schedules.slice(0, filter.limit) : schedules);
	}

	private require(scheduleId: string): CronSchedule {
		const schedule = this.readState().schedules.find((entry) => entry.id === scheduleId);
		if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
		return clone(schedule);
	}

	private exists(scheduleId: string): boolean {
		return this.readState().schedules.some((entry) => entry.id === scheduleId);
	}

	private create(schedule: CronSchedule): CronSchedule {
		return this.writeState((state) => {
			state.schedules.push(clone(schedule));
			return clone(schedule);
		});
	}

	private remove(scheduleId: string): CronSchedule {
		return this.writeState((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
			const [removed] = state.schedules.splice(index, 1);
			return clone(removed!);
		});
	}

	private update(scheduleId: string, patch: Partial<CronSchedule>): CronSchedule {
		return this.writeState((state) => {
			const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
			if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
			const current = state.schedules[index]!;
			const next: CronSchedule = {
				...current,
				...clone(patch),
				id: current.id,
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
