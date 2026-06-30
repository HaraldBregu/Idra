import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import { Container } from 'typedi';
import type { ModelReasoningEffort } from '../../../shared/agent/types';
import { AgentService } from '../main';
import { CronStore } from './store';

export interface CronJobInfo {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly expression: string;
	readonly enabled: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export type CronScheduleEventType =
	| 'schedule.created'
	| 'schedule.updated'
	| 'schedule.paused'
	| 'schedule.resumed'
	| 'schedule.deleted'
	| 'schedule.loaded'
	| 'schedule.recovered'
	| 'schedule.due'
	| 'schedule.triggered'
	| 'schedule.skipped'
	| 'schedule.missed'
	| 'schedule.failed'
	| 'schedule.completed'
	| 'schedule.permissionDenied'
	| 'schedule.nextRunUpdated';

export interface CronScheduledTask {
	id: string;
	title: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export type CronAction =
	| { type: 'debug'; message: string }
	| { type: 'agent'; prompt: string; effort: ModelReasoningEffort };

export interface CronSchedule {
	id: string;
	name: string;
	description?: string;
	cronExpression?: string;
	enabled: boolean;
	action: CronAction;
	createdAt: string;
	updatedAt: string;
}

export type CronScheduleCreateRequest = Omit<
	CronSchedule,
	'id' | 'createdAt' | 'updatedAt' | 'enabled'
> & {
	enabled?: boolean;
};

export type CronScheduleUpdateRequest = Partial<
	Omit<CronSchedule, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface CronScheduleEvent {
	eventId: string;
	scheduleId: string;
	type: CronScheduleEventType;
	timestamp: string;
	message: string;
}

export interface CronRuntime {
	providerId: string;
	modelId: string;
}

/** Shape persisted to the cron electron-store settings file. */
export interface PersistedCronState {
	enabled?: boolean;
	runtime?: CronRuntime;
	schedules: CronSchedule[];
}

export type CronFunctionId =
	| 'create_schedule'
	| 'update_schedule'
	| 'pause_schedule'
	| 'resume_schedule'
	| 'delete_schedule'
	| 'get_schedule'
	| 'list_schedules'
	| 'run_schedule_now';

export interface CronFunctionInput {
	create_schedule: { request: CronScheduleCreateRequest };
	update_schedule: { scheduleId: string; request: CronScheduleUpdateRequest };
	pause_schedule: { scheduleId: string };
	resume_schedule: { scheduleId: string };
	delete_schedule: { scheduleId: string };
	get_schedule: { scheduleId: string };
	list_schedules: Record<string, never>;
	run_schedule_now: { scheduleId: string };
}

export interface CronFunctionResult {
	create_schedule: CronSchedule;
	update_schedule: CronSchedule;
	pause_schedule: void;
	resume_schedule: void;
	delete_schedule: void;
	get_schedule: CronSchedule;
	list_schedules: CronSchedule[];
	run_schedule_now: CronScheduledTask;
}

export interface CronEvents {
	subscribe(listener: (event: CronScheduleEvent) => void): () => void;
}

export abstract class Cron {
	abstract get events(): CronEvents;

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
	abstract destroy(): void;

	abstract createSchedule(request: CronScheduleCreateRequest): CronSchedule;
	abstract updateSchedule(scheduleId: string, request: CronScheduleUpdateRequest): CronSchedule;
	abstract pauseSchedule(scheduleId: string): void;
	abstract resumeSchedule(scheduleId: string): void;
	abstract deleteSchedule(scheduleId: string): void;
	abstract getSchedule(scheduleId: string): CronSchedule;
	abstract listSchedules(): CronSchedule[];
	abstract runScheduleNow(scheduleId: string): CronScheduledTask;

	abstract invoke<K extends CronFunctionId>(id: K, input: CronFunctionInput[K]): CronFunctionResult[K];

	abstract listJobs(): CronJobInfo[];
	abstract deleteJob(id: string): void;
}

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}

export const CRON_STORE_DIRECTORY = 'cron';
export const CRON_STORE_FILE_NAME = 'settings';

export function defaultCronEnabled(): boolean {
	return process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false';
}

type CronEventListener = (event: CronScheduleEvent) => void;

interface CronJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}

export interface CronServiceEvents {
	subscribe(listener: CronEventListener): () => void;
}

export class CronService {
	private readonly store: CronStore;
	private readonly tasks = new Map<string, CronJobHandle>();
	private readonly listeners = new Set<CronEventListener>();
	private readonly enabled: boolean;

	private readonly handlers: {
		[K in CronFunctionId]: (input: CronFunctionInput[K]) => CronFunctionResult[K];
	} = {
		create_schedule: (input) => this.createSchedule(input.request),
		update_schedule: (input) => this.updateSchedule(input.scheduleId, input.request),
		pause_schedule: (input) => this.pauseSchedule(input.scheduleId),
		resume_schedule: (input) => this.resumeSchedule(input.scheduleId),
		delete_schedule: (input) => this.deleteSchedule(input.scheduleId),
		get_schedule: (input) => this.getSchedule(input.scheduleId),
		list_schedules: () => this.listSchedules(),
		run_schedule_now: (input) => this.runScheduleNow(input.scheduleId),
	};

	constructor(options: { enabled?: boolean } = {}) {
		this.store = new CronStore();
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
			cronExpression: request.cronExpression?.trim().replace(/\s+/g, ' '),
			enabled: request.enabled ?? true,
			action: request.action,
			createdAt: nowIso,
			updatedAt: nowIso,
		};
		const created = this.activate(this.create(schedule));
		this.emit(created, 'schedule.created', 'Schedule created.');
		return created;
	}

	updateSchedule(scheduleId: string, request: CronScheduleUpdateRequest): CronSchedule {
		const now = new Date().toISOString();
		const patch: Partial<CronSchedule> = { updatedAt: now };
		if (typeof request.name === 'string') patch.name = request.name.trim();
		if (typeof request.description === 'string') patch.description = request.description.trim();
		if (typeof request.cronExpression === 'string') {
			patch.cronExpression = request.cronExpression.trim().replace(/\s+/g, ' ');
		}
		if (typeof request.enabled === 'boolean') patch.enabled = request.enabled;
		if (request.action) patch.action = request.action;
		this.unscheduleJob(scheduleId);
		const updated = this.activate(this.update(scheduleId, patch));
		this.emit(updated, 'schedule.updated', 'Schedule updated.');
		return updated;
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

	listSchedules(): CronSchedule[] {
		return this.list();
	}

	getRuntime(): CronRuntime | undefined {
		const runtime = this.readState().runtime;
		return runtime ? clone(runtime) : undefined;
	}

	setRuntime(providerId: string, modelId: string): CronRuntime {
		const runtime: CronRuntime = { providerId: providerId.trim(), modelId: modelId.trim() };
		return this.writeState((state) => {
			state.runtime = clone(runtime);
			return clone(runtime);
		});
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
		const schedule = this.require(scheduleId);
		if (schedule.action.type === 'debug') {
			console.info('[CronService]', `Schedule ${scheduleId} fired: ${schedule.action.message}`);
		}
		if (schedule.action.type === 'agent') {
			void Container.of('main').get(AgentService).send(schedule.action.prompt, randomUUID(), {
				category: 'task',
				sessionId: scheduleId,
			});
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
		const task = this.buildTask(schedule);
		this.emit(schedule, 'schedule.triggered', 'Scheduled task created.');
		return task;
	}

	private buildTask(schedule: CronSchedule): CronScheduledTask {
		const now = new Date().toISOString();
		return {
			id: randomUUID(),
			title: schedule.name,
			description: schedule.description,
			createdAt: now,
			updatedAt: now,
		};
	}

	private emit(schedule: CronSchedule, type: CronScheduleEventType, message: string): void {
		const event: CronScheduleEvent = {
			eventId: randomUUID(),
			scheduleId: schedule.id,
			type,
			timestamp: new Date().toISOString(),
			message,
		};
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				console.error('[CronService]', 'Cron event listener failed.', error);
			}
		}
	}

	private list(): CronSchedule[] {
		const schedules = this.readState().schedules.sort(
			(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
		);
		return clone(schedules);
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
		return this.store.state;
	}

	private writeState<T>(mutate: (state: PersistedCronState) => T): T {
		const state = this.readState();
		const result = mutate(state);
		this.store.state = state;
		return result;
	}
}
