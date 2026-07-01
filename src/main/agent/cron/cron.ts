import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import type { ModelReasoningEffort } from '../../../shared/agent/types';
import { getCronState, setCronState } from './cron-store';

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

/** Shape persisted to the cron electron-store file. */
export interface PersistedCronState {
	enabled?: boolean;
	runtime?: CronRuntime;
	schedules: CronSchedule[];
}

export const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };

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

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.enabled;
}

type CronEventListener = (event: CronScheduleEvent) => void;

interface CronJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}

const tasks = new Map<string, CronJobHandle>();
const listeners = new Set<CronEventListener>();
let enabled = true;

const handlers: {
	[K in CronFunctionId]: (input: CronFunctionInput[K]) => CronFunctionResult[K];
} = {
	create_schedule: (input) => createSchedule(input.request),
	update_schedule: (input) => updateSchedule(input.scheduleId, input.request),
	pause_schedule: (input) => pauseSchedule(input.scheduleId),
	resume_schedule: (input) => resumeSchedule(input.scheduleId),
	delete_schedule: (input) => deleteSchedule(input.scheduleId),
	get_schedule: (input) => getSchedule(input.scheduleId),
	list_schedules: () => listSchedules(),
	run_schedule_now: (input) => runScheduleNow(input.scheduleId),
};

export const cronEvents: CronEvents = {
	subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};

export function initCron(): void {
	enabled = readState().enabled ?? true;
	writeState((state) => {
		state.enabled = enabled;
	});
}

export async function startCron(): Promise<void> {
	if (!enabled) {
		console.warn('[Cron]', 'Cron automatic execution is globally disabled.');
		return;
	}
	reconcile();
	for (const schedule of list().filter(isActiveSchedule)) {
		activate(schedule);
	}
	console.info('[Cron]', 'Cron service started.');
}

export async function stopCron(): Promise<void> {
	for (const task of tasks.values()) task.stop();
	tasks.clear();
}

export function destroyCron(): void {
	void stopCron();
	console.info('[Cron]', 'Disposed');
}

export function createSchedule(request: CronScheduleCreateRequest): CronSchedule {
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
	const created = activate(create(schedule));
	emit(created, 'schedule.created', 'Schedule created.');
	return created;
}

export function updateSchedule(
	scheduleId: string,
	request: CronScheduleUpdateRequest
): CronSchedule {
	const now = new Date().toISOString();
	const patch: Partial<CronSchedule> = { updatedAt: now };
	if (typeof request.name === 'string') patch.name = request.name.trim();
	if (typeof request.description === 'string') patch.description = request.description.trim();
	if (typeof request.cronExpression === 'string') {
		patch.cronExpression = request.cronExpression.trim().replace(/\s+/g, ' ');
	}
	if (typeof request.enabled === 'boolean') patch.enabled = request.enabled;
	if (request.action) patch.action = request.action;
	unscheduleJob(scheduleId);
	const updated = activate(update(scheduleId, patch));
	emit(updated, 'schedule.updated', 'Schedule updated.');
	return updated;
}

export function pauseSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const now = new Date().toISOString();
	const updated = update(scheduleId, {
		enabled: false,
		updatedAt: now,
	});
	emit(updated, 'schedule.paused', 'Schedule paused.');
}

export function resumeSchedule(scheduleId: string): void {
	const now = new Date().toISOString();
	const updated = activate(
		update(scheduleId, {
			enabled: true,
			updatedAt: now,
		})
	);
	emit(updated, 'schedule.resumed', 'Schedule resumed.');
}

export function deleteSchedule(scheduleId: string): void {
	unscheduleJob(scheduleId);
	const removed = remove(scheduleId);
	emit(removed, 'schedule.deleted', 'Schedule deleted.');
}

export function getSchedule(scheduleId: string): CronSchedule {
	return requireSchedule(scheduleId);
}

export function listSchedules(): CronSchedule[] {
	return list();
}

export function getRuntime(): CronRuntime | undefined {
	const runtime = readState().runtime;
	return runtime ? clone(runtime) : undefined;
}

export function setRuntime(providerId: string, modelId: string): CronRuntime {
	const runtime: CronRuntime = { providerId: providerId.trim(), modelId: modelId.trim() };
	return writeState((state) => {
		state.runtime = clone(runtime);
		return clone(runtime);
	});
}

export function runScheduleNow(scheduleId: string): CronScheduledTask {
	return trigger(scheduleId);
}

export function invokeCron<K extends CronFunctionId>(
	id: K,
	input: CronFunctionInput[K]
): CronFunctionResult[K] {
	const handler = handlers[id];
	if (!handler) throw new Error(`Unknown cron function: ${id}`);
	return handler(input);
}

export function listJobs(): CronJobInfo[] {
	return [];
}

export function deleteJob(_id: string): void {
	void _id;
}

function activate(schedule: CronSchedule): CronSchedule {
	if (!isActiveSchedule(schedule)) return schedule;
	scheduleJob(schedule);
	return schedule;
}

function scheduleJob(schedule: CronSchedule): void {
	unscheduleJob(schedule.id);
	const handle = createJob(schedule);
	if (handle) tasks.set(schedule.id, handle);
}

function createJob(schedule: CronSchedule): CronJobHandle | undefined {
	if (schedule.cronExpression) return createCronJob(schedule);
	console.warn('[Cron]', `Schedule ${schedule.id} skipped: no cronExpression provided.`);
	return undefined;
}

function createCronJob(schedule: CronSchedule): CronJobHandle | undefined {
	if (!schedule.cronExpression || !cron.validate(schedule.cronExpression)) {
		console.warn(
			'[Cron]',
			`Schedule ${schedule.id} has an invalid cron expression: ${schedule.cronExpression}`
		);
		return undefined;
	}
	const task = cron.schedule(schedule.cronExpression, () => fire(schedule.id), {
		name: schedule.id,
	});
	return { stop: () => task.destroy(), getNextRun: () => task.getNextRun() };
}

function unscheduleJob(scheduleId: string): void {
	const task = tasks.get(scheduleId);
	if (task) {
		task.stop();
		tasks.delete(scheduleId);
	}
	for (const cronTask of cron.getTasks().values()) {
		if (cronTask.name === scheduleId) void cronTask.destroy();
	}
}

function fire(scheduleId: string): void {
	if (!exists(scheduleId)) {
		console.warn(
			'[Cron]',
			`Orphaned cron job removed: schedule ${scheduleId} no longer exists.`
		);
		unscheduleJob(scheduleId);
		return;
	}
	const schedule = requireSchedule(scheduleId);
	if (schedule.action.type === 'debug') {
		console.info('[Cron]', `Schedule ${scheduleId} fired: ${schedule.action.message}`);
	}
	if (schedule.action.type === 'agent') {
	}
	trigger(scheduleId);
}

function reconcile(): void {
	const active = new Set(list().filter(isActiveSchedule).map((schedule) => schedule.id));
	for (const task of cron.getTasks().values()) {
		if (task.name && !active.has(task.name)) {
			console.warn('[Cron]', `Destroying orphaned cron job ${task.name}.`);
			void task.destroy();
		}
	}
}

function trigger(scheduleId: string): CronScheduledTask {
	const schedule = requireSchedule(scheduleId);
	const task = buildTask(schedule);
	emit(schedule, 'schedule.triggered', 'Scheduled task created.');
	return task;
}

function buildTask(schedule: CronSchedule): CronScheduledTask {
	const now = new Date().toISOString();
	return {
		id: randomUUID(),
		title: schedule.name,
		description: schedule.description,
		createdAt: now,
		updatedAt: now,
	};
}

function emit(schedule: CronSchedule, type: CronScheduleEventType, message: string): void {
	const event: CronScheduleEvent = {
		eventId: randomUUID(),
		scheduleId: schedule.id,
		type,
		timestamp: new Date().toISOString(),
		message,
	};
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (error) {
			console.error('[Cron]', 'Cron event listener failed.', error);
		}
	}
}

function list(): CronSchedule[] {
	const schedules = readState().schedules.sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
	);
	return clone(schedules);
}

function requireSchedule(scheduleId: string): CronSchedule {
	const schedule = readState().schedules.find((entry) => entry.id === scheduleId);
	if (!schedule) throw new Error(`Cron schedule not found: ${scheduleId}`);
	return clone(schedule);
}

function exists(scheduleId: string): boolean {
	return readState().schedules.some((entry) => entry.id === scheduleId);
}

function create(schedule: CronSchedule): CronSchedule {
	return writeState((state) => {
		state.schedules.push(clone(schedule));
		return clone(schedule);
	});
}

function remove(scheduleId: string): CronSchedule {
	return writeState((state) => {
		const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
		if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
		const [removed] = state.schedules.splice(index, 1);
		return clone(removed!);
	});
}

function update(scheduleId: string, patch: Partial<CronSchedule>): CronSchedule {
	return writeState((state) => {
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

function readState(): PersistedCronState {
	return getCronState();
}

function writeState<T>(mutate: (state: PersistedCronState) => T): T {
	const state = readState();
	const result = mutate(state);
	setCronState(state);
	return result;
}
