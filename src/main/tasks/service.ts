import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import { DEFAULT_AGENT_ID } from '../constants';
import type {
	TaskEvent,
	TaskHandler,
	TaskProgress,
	TaskRecord,
	TaskRunRequest,
	TaskStatus,
	TaskStoreState,
} from '../../shared/tasks';

export const AGENT_TASK_TYPE = 'agent.run';
export const TASK_STORE_SCHEMA_VERSION = 1;

export interface AgentTaskInput {
	message: string;
}

export interface AgentTaskResult {
	text: string;
}

export interface TaskRegistrationOptions {
	userFacing?: boolean;
}

export interface TasksAgentRunner {
	send(
		message: string,
		agentId?: string,
		options?: { sessionId?: string; providerId?: string; model?: string }
	): Promise<string>;
	cancel(sessionId?: string): void | Promise<void>;
}

export interface TaskPersistencePort {
	load(): unknown;
	save(state: TaskStoreState): void;
}

export interface TasksServiceOptions {
	store: Pick<StoreService, 'getAgentService' | 'getTaskSettings'>;
	eventBus?: EventBus;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	idFactory?: () => string;
	now?: () => string;
	persistence?: TaskPersistencePort;
}

interface InternalTaskState {
	record: TaskRecord;
	input: unknown;
	handler: TaskHandler;
	controller: AbortController;
	promise?: Promise<void>;
}

const TASK_TYPE_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const TERMINAL_STATUSES = new Set<TaskStatus>(['cancelled', 'succeeded', 'failed']);
const RESTORED_ACTIVE_STATUSES = new Set<TaskStatus>(['queued', 'running', 'cancelling']);
const ALLOWED_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
	queued: ['running', 'cancelled'],
	running: ['cancelling', 'succeeded', 'failed'],
	cancelling: ['cancelled', 'failed'],
	cancelled: [],
	succeeded: [],
	failed: [],
};
const SECRET_KEY_PATTERN =
	/(api[_-]?key|authorization|credential|password|private[_-]?key|secret|token)/i;
const SECRET_VALUE_PATTERNS: readonly (readonly [RegExp, string])[] = [
	[
		/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
		'[redacted private key]',
	],
	[/((?:authorization)\s*:\s*bearer\s+)[^\s,;]+/gi, '$1[redacted]'],
	[/((?:api[_-]?key|credential|password|secret|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]'],
];
const MAX_STRING_LENGTH = 4_000;
const MAX_PROGRESS_MESSAGE_LENGTH = 500;
const MAX_OBJECT_KEYS = 50;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 4;
const UNBOUNDED_CONCURRENCY = Number.MAX_SAFE_INTEGER;
const ALLOWED_AGENT_INPUT_KEYS = new Set(['message']);
const TASK_CANCELLED_ERROR_NAME = 'AbortError';
const AGENT_SECRET_PATTERN =
	/authorization\s*:\s*bearer\s+\S+|(?:api[_-]?key|credential|password|secret|token)\s*[:=]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

class ElectronTaskPersistence implements TaskPersistencePort {
	private readonly store = new Store<TaskStoreState>({
		name: 'task',
		accessPropertiesByDotNotation: false,
		defaults: {
			schemaVersion: TASK_STORE_SCHEMA_VERSION,
			records: [],
			updatedAt: new Date(0).toISOString(),
		},
	});

	load(): unknown {
		return this.store.store;
	}

	save(state: TaskStoreState): void {
		this.store.store = state;
	}
}

export class TasksService {
	private readonly records = new Map<string, TaskRecord>();
	private readonly runtime = new Map<string, InternalTaskState>();
	private readonly queuedTaskIds: string[] = [];
	private readonly activeTaskIds = new Set<string>();
	private readonly handlers = new Map<string, TaskHandler>();
	private readonly userFacingTypes = new Set<string>();
	private readonly store: Pick<StoreService, 'getAgentService' | 'getTaskSettings'>;
	private readonly eventBus?: EventBus;
	private readonly logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	private readonly idFactory: () => string;
	private readonly now: () => string;
	private readonly persistence: TaskPersistencePort;
	private pumpScheduled = false;
	private agentRunner?: TasksAgentRunner;

	constructor(options: TasksServiceOptions) {
		this.store = options.store;
		this.eventBus = options.eventBus;
		this.logger = options.logger;
		this.idFactory = options.idFactory ?? randomUUID;
		this.now = options.now ?? (() => new Date().toISOString());
		this.persistence = options.persistence ?? new ElectronTaskPersistence();
		this.registerHandler(this.createAgentHandler(), { userFacing: true });
		this.loadPersistedState();
	}

	configureAgentRuntime(agentRunner: TasksAgentRunner): void {
		this.agentRunner = agentRunner;
		this.logger?.info('TasksService', 'Configured agent task runtime');
	}

	registerHandler(handler: TaskHandler, options: TaskRegistrationOptions = {}): void {
		const type = normalizeTaskType(handler.type);
		if (handler.type !== type) {
			this.logger?.warn('TasksService', 'Rejected unnormalized task handler type', {
				type: handler.type,
			});
			throw new Error(`Task handler type must be normalized: ${handler.type}`);
		}
		if (this.handlers.has(type)) throw new Error(`Task handler already registered: ${type}`);
		this.handlers.set(type, handler);
		if (options.userFacing) this.userFacingTypes.add(type);
		this.logger?.info('TasksService', `Registered task handler ${type}`);
	}

	create<TResult = unknown>(request: TaskRunRequest): TaskRecord<TResult> {
		return this.createFromRequest(request, false, false);
	}

	run<TResult = unknown>(request: TaskRunRequest): TaskRecord<TResult> {
		return this.createFromRequest(request, true, false);
	}

	startUserTask<TResult = unknown>(request: TaskRunRequest): TaskRecord<TResult> {
		return this.createFromRequest(request, true, true);
	}

	read(id: string): TaskRecord | undefined {
		return this.get(id);
	}

	get(id: string): TaskRecord | undefined {
		const record = this.records.get(id);
		return record ? cloneTaskRecord(record) : undefined;
	}

	list(): TaskRecord[] {
		return [...this.records.values()].map((record) => cloneTaskRecord(record));
	}

	update(id: string, patch: Partial<TaskRecord>): TaskRecord {
		const current = this.records.get(id);
		if (!current) throw new Error(`Task not found: ${id}`);
		const next = sanitizeRecord({ ...current, ...patch, id: current.id, type: current.type });
		this.records.set(id, next);
		const runtime = this.runtime.get(id);
		if (runtime) runtime.record = next;
		this.persist();
		this.emitEvent({ type: 'task:updated', task: cloneTaskRecord(next) });
		return cloneTaskRecord(next);
	}

	delete(id: string): void {
		const record = this.records.get(id);
		if (!record) return;
		if (!TERMINAL_STATUSES.has(record.status) && this.runtime.has(id)) {
			throw new Error(`Cannot delete active task: ${id}`);
		}
		this.records.delete(id);
		this.runtime.delete(id);
		removeQueued(this.queuedTaskIds, id);
		this.persist();
		this.logger?.info('TasksService', `Deleted task ${id}`);
	}

	cancel(id: string): TaskRecord {
		const state = this.runtime.get(id);
		const record = this.records.get(id);
		if (!record) throw new Error(`Task not found: ${id}`);
		if (!state) return cloneTaskRecord(record);
		if (TERMINAL_STATUSES.has(state.record.status)) return cloneTaskRecord(state.record);

		if (state.record.status === 'queued') {
			state.controller.abort();
			removeQueued(this.queuedTaskIds, id);
			this.transition(state, 'cancelled', { finishedAt: this.now() });
			this.emitEvent({ type: 'task:cancelled', task: cloneTaskRecord(state.record) });
			this.schedulePump();
			return cloneTaskRecord(state.record);
		}

		if (state.record.status === 'running') {
			this.transition(state, 'cancelling');
			this.emitEvent({ type: 'task:updated', task: cloneTaskRecord(state.record) });
		}
		if (!state.controller.signal.aborted) state.controller.abort();
		return cloneTaskRecord(state.record);
	}

	private createTask<TResult = unknown>(
		request: TaskRunRequest,
		handler: TaskHandler,
		start: boolean
	): TaskRecord<TResult> {
		const type = requireString(request.type, 'Task type');
		const title = requireString(request.title, 'Task title');
		if (handler.type !== type) throw new Error(`Task handler type mismatch: ${type}`);
		const input = handler.validateInput ? handler.validateInput(request.input) : request.input;
		const id = request.id ? requireString(request.id, 'Task id') : this.idFactory();
		if (this.records.has(id)) throw new Error(`Task already exists: ${id}`);
		const model = this.resolveTaskModel(request, input);

		const record = sanitizeRecord({
			id,
			type: handler.type,
			title,
			status: 'queued',
			providerId: model.providerId,
			modelId: model.modelId,
			createdAt: this.now(),
			metadata: sanitizeMetadata(request.metadata),
		});
		const state: InternalTaskState = {
			record,
			input,
			handler,
			controller: new AbortController(),
		};
		this.records.set(id, record);
		this.runtime.set(id, state);
		this.queuedTaskIds.push(id);
		this.emitEvent({ type: 'task:created', task: cloneTaskRecord(record) });
		if (start) this.schedulePump();
		return cloneTaskRecord(record) as TaskRecord<TResult>;
	}

	private createFromRequest<TResult = unknown>(
		request: TaskRunRequest,
		start: boolean,
		userFacing: boolean
	): TaskRecord<TResult> {
		try {
			const type = readTaskRequestType(request);
			if (userFacing) this.assertTaskPolicyAllows(type);
			const handler = userFacing ? this.requireUserFacingHandler(type) : this.requireHandler(type);
			return this.createTask(request, handler, start);
		} catch (error) {
			this.logger?.warn('TasksService', 'Rejected task request', publicError(error));
			throw error;
		}
	}

	private resolveTaskModel(
		request: TaskRunRequest,
		input: unknown
	): { providerId?: string; modelId?: string } {
		const configured = this.store.getAgentService?.();
		const inputRecord =
			input && typeof input === 'object' && !Array.isArray(input)
				? (input as Record<string, unknown>)
				: {};
		const providerId =
			stringValue(request.providerId) ??
			stringValue(inputRecord.providerId) ??
			stringValue(configured?.provider.id);
		const modelId =
			stringValue(request.modelId) ??
			stringValue(inputRecord.modelId) ??
			stringValue(configured?.model.id) ??
			stringValue(configured?.model.name);
		return { providerId, modelId };
	}

	private schedulePump(): void {
		if (this.pumpScheduled) return;
		this.pumpScheduled = true;
		void Promise.resolve().then(() => {
			this.pumpScheduled = false;
			this.pumpQueue();
		});
	}

	private pumpQueue(): void {
		const maxActiveTasks = this.maxActiveTasks();
		while (this.activeTaskIds.size < maxActiveTasks) {
			const taskId = this.queuedTaskIds.shift();
			if (!taskId) return;
			const state = this.runtime.get(taskId);
			if (!state || !this.hasStatus(state, 'queued')) continue;
			this.activeTaskIds.add(taskId);
			state.promise = this.startTask(taskId);
		}
	}

	private maxActiveTasks(): number {
		const configured = this.store.getTaskSettings?.()?.defaultConcurrency;
		return typeof configured === 'number' && Number.isSafeInteger(configured) && configured > 0
			? configured
			: UNBOUNDED_CONCURRENCY;
	}

	private async startTask(taskId: string): Promise<void> {
		const state = this.runtime.get(taskId);
		if (!state || !this.hasStatus(state, 'queued')) {
			this.activeTaskIds.delete(taskId);
			this.schedulePump();
			return;
		}

		this.transition(state, 'running', { startedAt: this.now() });
		this.emitEvent({ type: 'task:started', task: cloneTaskRecord(state.record) });

		try {
			if (state.controller.signal.aborted) {
				this.completeCancelled(state);
				return;
			}
			const result = await state.handler.run({
				taskId,
				input: state.input,
				providerId: state.record.providerId,
				modelId: state.record.modelId,
				signal: state.controller.signal,
				updateProgress: (progress) => this.updateProgress(taskId, progress),
			});
			if (state.record.status === 'cancelling' || state.controller.signal.aborted) {
				this.completeCancelled(state);
				return;
			}
			if (state.record.status !== 'running') return;
			this.transition(state, 'succeeded', {
				finishedAt: this.now(),
				result: sanitizeTaskValue(result),
			});
			this.emitEvent({ type: 'task:succeeded', task: cloneTaskRecord(state.record) });
		} catch (error) {
			if (
				state.controller.signal.aborted ||
				(state.record.status === 'cancelling' && isTaskCancelledError(error))
			) {
				this.completeCancelled(state);
				return;
			}
			this.logger?.error('TasksService', `Task ${taskId} failed`, publicError(error));
			if (state.record.status !== 'running' && state.record.status !== 'cancelling') return;
			this.transition(state, 'failed', {
				finishedAt: this.now(),
				error: publicError(error),
			});
			this.emitEvent({ type: 'task:failed', task: cloneTaskRecord(state.record) });
		} finally {
			this.activeTaskIds.delete(taskId);
			this.schedulePump();
		}
	}

	private updateProgress(taskId: string, progress: TaskProgress): void {
		const state = this.runtime.get(taskId);
		if (!state || (state.record.status !== 'running' && state.record.status !== 'cancelling')) {
			return;
		}
		const nextProgress = sanitizeProgress(progress);
		const next: TaskRecord = { ...state.record };
		if (nextProgress) next.progress = nextProgress;
		else delete next.progress;
		state.record = sanitizeRecord(next);
		this.records.set(taskId, state.record);
		this.emitEvent({ type: 'task:updated', task: cloneTaskRecord(state.record) });
	}

	private completeCancelled(state: InternalTaskState): void {
		if (TERMINAL_STATUSES.has(state.record.status)) return;
		if (state.record.status === 'running') {
			this.transition(state, 'cancelling');
			this.emitEvent({ type: 'task:updated', task: cloneTaskRecord(state.record) });
		}
		this.transition(state, 'cancelled', { finishedAt: this.now() });
		this.emitEvent({ type: 'task:cancelled', task: cloneTaskRecord(state.record) });
	}

	private transition(
		state: InternalTaskState,
		status: TaskStatus,
		patch: Partial<TaskRecord> = {}
	): void {
		const current = state.record.status;
		if (!ALLOWED_TRANSITIONS[current].includes(status)) {
			throw new Error(`Invalid task status transition: ${current} -> ${status}`);
		}
		state.record = sanitizeRecord({ ...state.record, ...patch, status });
		this.records.set(state.record.id, state.record);
		this.persist();
	}

	private hasStatus(state: InternalTaskState, status: TaskStatus): boolean {
		return state.record.status === status;
	}

	private emitEvent(event: TaskEvent): void {
		this.persist();
		this.logger?.info('TasksService', `${event.type} ${event.task.id} ${event.task.type}`, {
			status: event.task.status,
		});
		this.eventBus?.emit(event.type, event as never);
	}

	private assertTaskPolicyAllows(type: string): void {
		const allowedTaskTypes = this.store.getTaskSettings?.()?.allowedTaskTypes;
		if (!allowedTaskTypes || allowedTaskTypes.length === 0) return;
		const normalized = normalizeTaskType(type);
		if (!allowedTaskTypes.includes(normalized)) {
			this.logger?.warn('TasksService', 'Background task policy denied task type', {
				type: normalized,
			});
			throw new Error(`Task type is not allowed by background task policy: ${normalized}`);
		}
	}

	private requireHandler(type: string): TaskHandler {
		const normalized = normalizeTaskType(type);
		const handler = this.handlers.get(normalized);
		if (!handler) throw new Error(`Unknown task type: ${normalized}`);
		return handler;
	}

	private requireUserFacingHandler(type: string): TaskHandler {
		const normalized = normalizeTaskType(type);
		if (!this.userFacingTypes.has(normalized)) {
			throw new Error(`Task type is not approved for renderer start: ${normalized}`);
		}
		return this.requireHandler(normalized);
	}

	private createAgentHandler(): TaskHandler<AgentTaskInput, AgentTaskResult> {
		return {
			type: AGENT_TASK_TYPE,
			validateInput: validateAgentTaskInput,
			run: async (context) => {
				if (context.signal.aborted) throw taskCancelledError();
				if (!this.agentRunner) throw new Error('Agent task runtime is not configured.');
				if (!context.providerId) throw new Error('Agent provider not configured.');
				if (!context.modelId) throw new Error('Agent model not configured.');
				const sessionId = `task:${context.taskId}`;
				const cancelAgent = (): void => {
					void this.agentRunner?.cancel(sessionId);
				};
				context.updateProgress({ message: 'Starting agent' });
				context.signal.addEventListener('abort', cancelAgent, { once: true });
				try {
					const text = await this.agentRunner.send(context.input.message, DEFAULT_AGENT_ID, {
						sessionId,
						providerId: context.providerId,
						model: context.modelId,
					});
					if (context.signal.aborted) throw taskCancelledError();
					context.updateProgress({ message: 'Agent completed' });
					return { text };
				} finally {
					context.signal.removeEventListener('abort', cancelAgent);
				}
			},
		};
	}

	private loadPersistedState(): void {
		const state = normalizeTaskStoreState(this.persistence.load());
		let changed = false;
		for (const record of state.records) {
			const restored = this.restorePersistedRecord(record);
			if (restored.status !== record.status) changed = true;
			this.records.set(restored.id, restored);
		}
		this.logger?.info('TasksService', `Loaded ${this.records.size} persisted task record(s)`);
		if (changed) this.persist();
	}

	private restorePersistedRecord(record: TaskRecord): TaskRecord {
		const sanitized = sanitizeRecord(record);
		if (!RESTORED_ACTIVE_STATUSES.has(sanitized.status)) return sanitized;
		this.logger?.warn('TasksService', 'Marking interrupted persisted task as failed', {
			id: sanitized.id,
			type: sanitized.type,
			status: sanitized.status,
		});
		return sanitizeRecord({
			...sanitized,
			status: 'failed',
			finishedAt: sanitized.finishedAt ?? this.now(),
			error: {
				code: 'TaskInterrupted',
				message: 'Task did not finish before the app stopped.',
			},
		});
	}

	private persist(): void {
		this.persistence.save({
			schemaVersion: TASK_STORE_SCHEMA_VERSION,
			records: this.list(),
			updatedAt: this.now(),
		});
	}
}

export function sanitizeTaskValue(
	value: unknown,
	depth = 0,
	seen = new WeakSet<object>()
): unknown {
	if (value === null || typeof value === 'boolean' || typeof value === 'string') {
		return typeof value === 'string' ? truncate(value) : value;
	}
	if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
	if (typeof value === 'bigint') return value.toString();
	if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
		return undefined;
	}
	if (value instanceof Date) return value.toISOString();
	if (depth >= MAX_DEPTH) return '[max depth]';
	if (typeof value !== 'object') return String(value);
	if (seen.has(value)) return '[circular]';

	seen.add(value);
	if (Array.isArray(value)) {
		const items = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => sanitizeTaskValue(item, depth + 1, seen) ?? null);
		if (value.length > MAX_ARRAY_ITEMS) items.push('[truncated]');
		seen.delete(value);
		return items;
	}

	const entries = Object.entries(value as Record<string, unknown>);
	const output: Record<string, unknown> = {};
	for (const [key, item] of entries.slice(0, MAX_OBJECT_KEYS)) {
		const safeKey = truncate(key, 100);
		if (SECRET_KEY_PATTERN.test(key)) {
			output[safeKey] = '[redacted]';
			continue;
		}
		const safeValue = sanitizeTaskValue(item, depth + 1, seen);
		if (safeValue !== undefined) output[safeKey] = safeValue;
	}
	if (entries.length > MAX_OBJECT_KEYS) output.__truncated = true;
	seen.delete(value);
	return output;
}

function normalizeTaskStoreState(value: unknown): TaskStoreState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return emptyTaskStoreState();
	}
	const record = value as Partial<TaskStoreState>;
	return {
		schemaVersion: TASK_STORE_SCHEMA_VERSION,
		records: Array.isArray(record.records)
			? record.records.flatMap((entry) => normalizeTaskRecord(entry))
			: [],
		updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
	};
}

function normalizeTaskRecord(value: unknown): TaskRecord[] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
	const record = value as Partial<TaskRecord>;
	if (
		typeof record.id !== 'string' ||
		typeof record.type !== 'string' ||
		typeof record.title !== 'string' ||
		!isTaskStatus(record.status) ||
		typeof record.createdAt !== 'string'
	) {
		return [];
	}
	return [sanitizeRecord(record as TaskRecord)];
}

function emptyTaskStoreState(): TaskStoreState {
	return {
		schemaVersion: TASK_STORE_SCHEMA_VERSION,
		records: [],
		updatedAt: new Date(0).toISOString(),
	};
}

function sanitizeRecord(record: TaskRecord): TaskRecord {
	const next: TaskRecord = {
		id: requireString(record.id, 'Task id'),
		type: normalizeTaskType(record.type),
		title: requireString(record.title, 'Task title'),
		status: isTaskStatus(record.status) ? record.status : 'failed',
		createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
		metadata: sanitizeMetadata(record.metadata),
	};
	const providerId = stringValue(record.providerId);
	const modelId = stringValue(record.modelId);
	if (providerId) next.providerId = providerId;
	if (modelId) next.modelId = modelId;
	if (typeof record.startedAt === 'string') next.startedAt = record.startedAt;
	if (typeof record.finishedAt === 'string') next.finishedAt = record.finishedAt;
	const progress = sanitizeProgress(record.progress);
	if (progress) next.progress = progress;
	const result = sanitizeTaskValue(record.result);
	if (result !== undefined) next.result = result;
	if (record.error) next.error = publicError(record.error);
	return next;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const sanitized = sanitizeTaskValue(value);
	return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
		? (sanitized as Record<string, unknown>)
		: {};
}

function sanitizeProgress(progress: TaskProgress): TaskProgress {
	if (!progress || typeof progress !== 'object') return undefined;
	const next: NonNullable<TaskProgress> = {};
	if (Number.isFinite(progress.current)) next.current = progress.current;
	if (Number.isFinite(progress.total)) next.total = progress.total;
	if (typeof progress.message === 'string') {
		const message = truncate(progress.message.trim(), MAX_PROGRESS_MESSAGE_LENGTH);
		if (message) next.message = message;
	}
	return Object.keys(next).length > 0 ? next : undefined;
}

function publicError(error: unknown): { code: string; message: string } {
	if (error && typeof error === 'object') {
		const code =
			stringValue((error as { code?: unknown }).code) ??
			(error instanceof Error ? stringValue(error.name) : undefined) ??
			'TaskError';
		const message =
			stringValue((error as { message?: unknown }).message) ??
			(error instanceof Error ? stringValue(error.message) : undefined) ??
			'Task failed.';
		return { code: truncate(code, 100), message: truncate(message) };
	}
	return { code: 'TaskError', message: truncate(String(error || 'Task failed.')) };
}

function taskCancelledError(message = 'Task was cancelled.'): Error {
	const error = new Error(message);
	error.name = TASK_CANCELLED_ERROR_NAME;
	return error;
}

function isTaskCancelledError(error: unknown): boolean {
	return error instanceof Error && error.name === TASK_CANCELLED_ERROR_NAME;
}

function validateAgentTaskInput(input: unknown): AgentTaskInput {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('Agent task input must be an object.');
	}
	const record = input as Record<string, unknown>;
	for (const key of Object.keys(record)) {
		if (!ALLOWED_AGENT_INPUT_KEYS.has(key)) throw new Error(`${key} is not allowed in agent task input.`);
	}
	if (typeof record.message !== 'string') throw new Error('message is required.');
	const message = record.message.trim();
	if (!message) throw new Error('message is required.');
	if (message.length > 200_000) throw new Error('message is too long.');
	if (AGENT_SECRET_PATTERN.test(message)) throw new Error('message contains secret-looking content.');
	return { message };
}

function normalizeTaskType(type: string): string {
	const value = type.trim();
	if (!value) throw new Error('Task type is required.');
	if (value.length > 128) throw new Error('Task type is too long.');
	if (!TASK_TYPE_PATTERN.test(value)) throw new Error(`Invalid task type: ${type}`);
	return value;
}

function requireString(value: unknown, name: string): string {
	if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${name} is required.`);
	return trimmed;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readTaskRequestType(request: unknown): string {
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Task request must be an object.');
	}
	return requireString((request as Record<string, unknown>).type, 'Task type');
}

function isTaskStatus(value: unknown): value is TaskStatus {
	return (
		value === 'queued' ||
		value === 'running' ||
		value === 'cancelling' ||
		value === 'cancelled' ||
		value === 'succeeded' ||
		value === 'failed'
	);
}

function truncate(value: string, maxLength = MAX_STRING_LENGTH): string {
	const redacted = SECRET_VALUE_PATTERNS.reduce(
		(next, [pattern, replacement]) => next.replace(pattern, replacement),
		value
	);
	if (redacted.length <= maxLength) return redacted;
	return `${redacted.slice(0, maxLength)}...[truncated]`;
}

function cloneTaskRecord<TResult = unknown>(record: TaskRecord<TResult>): TaskRecord<TResult> {
	return JSON.parse(JSON.stringify(record)) as TaskRecord<TResult>;
}

function removeQueued(queue: string[], id: string): void {
	const index = queue.indexOf(id);
	if (index !== -1) queue.splice(index, 1);
}
