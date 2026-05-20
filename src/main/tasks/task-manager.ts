import { randomUUID } from 'node:crypto';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type {
	TaskEvent,
	TaskHandler,
	TaskProgress,
	TaskRecord,
	TaskRunRequest,
	TaskStatus,
} from '../../shared/tasks';
import type { TaskRegistry } from './task-registry';

interface InternalTaskState {
	record: TaskRecord;
	input: unknown;
	controller: AbortController;
	promise?: Promise<void>;
}

export interface TaskManagerOptions {
	registry: TaskRegistry;
	eventBus: EventBus;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	idFactory?: () => string;
	now?: () => string;
}

const TERMINAL_STATUSES = new Set<TaskStatus>(['cancelled', 'succeeded', 'failed']);
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
const MAX_STRING_LENGTH = 4_000;
const MAX_PROGRESS_MESSAGE_LENGTH = 500;
const MAX_OBJECT_KEYS = 50;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 4;

function truncate(value: string, maxLength = MAX_STRING_LENGTH): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength)}...[truncated]`;
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

function errorCode(error: unknown): string {
	if (error instanceof Error && error.name.trim()) return truncate(error.name, 100);
	return 'TaskError';
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return truncate(error.message);
	return truncate(String(error || 'Task failed.'));
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

function cloneTaskRecord<TResult = unknown>(record: TaskRecord<TResult>): TaskRecord<TResult> {
	return JSON.parse(JSON.stringify(record)) as TaskRecord<TResult>;
}

function requireString(value: unknown, name: string): string {
	if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${name} is required.`);
	return trimmed;
}

export class TaskManager {
	private readonly tasks = new Map<string, InternalTaskState>();
	private readonly registry: TaskRegistry;
	private readonly eventBus: EventBus;
	private readonly logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	private readonly idFactory: () => string;
	private readonly now: () => string;

	constructor(options: TaskManagerOptions) {
		this.registry = options.registry;
		this.eventBus = options.eventBus;
		this.logger = options.logger;
		this.idFactory = options.idFactory ?? randomUUID;
		this.now = options.now ?? (() => new Date().toISOString());
	}

	run<TResult = unknown>(request: TaskRunRequest): TaskRecord<TResult> {
		const type = requireString(request.type, 'Task type');
		const title = requireString(request.title, 'Task title');
		const handler = this.registry.require(type);
		const input = handler.validateInput ? handler.validateInput(request.input) : request.input;
		const id = request.id ? requireString(request.id, 'Task id') : this.idFactory();
		if (this.tasks.has(id)) throw new Error(`Task already exists: ${id}`);

		const record: TaskRecord = {
			id,
			type: handler.type,
			title,
			status: 'queued',
			createdAt: this.now(),
			metadata: sanitizeMetadata(request.metadata),
		};
		const state: InternalTaskState = {
			record,
			input,
			controller: new AbortController(),
		};
		this.tasks.set(id, state);
		this.emitEvent({ type: 'task:created', task: cloneTaskRecord(record) });
		state.promise = Promise.resolve().then(() => this.startTask(id, handler));
		return cloneTaskRecord(record) as TaskRecord<TResult>;
	}

	list(): TaskRecord[] {
		return [...this.tasks.values()].map((state) => cloneTaskRecord(state.record));
	}

	get(id: string): TaskRecord | undefined {
		const state = this.tasks.get(id);
		return state ? cloneTaskRecord(state.record) : undefined;
	}

	cancel(id: string): TaskRecord {
		const state = this.tasks.get(id);
		if (!state) throw new Error(`Task not found: ${id}`);
		if (TERMINAL_STATUSES.has(state.record.status)) return cloneTaskRecord(state.record);

		if (state.record.status === 'queued') {
			state.controller.abort();
			this.transition(state, 'cancelled', { finishedAt: this.now() });
			this.emitEvent({ type: 'task:cancelled', task: cloneTaskRecord(state.record) });
			return cloneTaskRecord(state.record);
		}

		if (state.record.status === 'running') {
			this.transition(state, 'cancelling');
			this.emitEvent({ type: 'task:updated', task: cloneTaskRecord(state.record) });
		}
		if (!state.controller.signal.aborted) state.controller.abort();
		return cloneTaskRecord(state.record);
	}

	private async startTask(taskId: string, handler: TaskHandler): Promise<void> {
		const state = this.tasks.get(taskId);
		if (!state || !this.hasStatus(state, 'queued')) return;

		this.transition(state, 'running', { startedAt: this.now() });
		this.emitEvent({ type: 'task:started', task: cloneTaskRecord(state.record) });

		try {
			if (state.controller.signal.aborted) {
				this.completeCancelled(state);
				return;
			}
			const result = await handler.run({
				taskId,
				input: state.input,
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
			if (state.record.status === 'cancelling' && isAbortError(error)) {
				this.completeCancelled(state);
				return;
			}
			if (state.record.status !== 'running' && state.record.status !== 'cancelling') return;
			this.transition(state, 'failed', {
				finishedAt: this.now(),
				error: {
					code: errorCode(error),
					message: errorMessage(error),
				},
			});
			this.emitEvent({ type: 'task:failed', task: cloneTaskRecord(state.record) });
		}
	}

	private updateProgress(taskId: string, progress: TaskProgress): void {
		const state = this.tasks.get(taskId);
		if (!state || (state.record.status !== 'running' && state.record.status !== 'cancelling')) {
			return;
		}
		const nextProgress = sanitizeProgress(progress);
		const next: TaskRecord = { ...state.record };
		if (nextProgress) {
			next.progress = nextProgress;
		} else {
			delete next.progress;
		}
		state.record = next;
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
		state.record = {
			...state.record,
			...patch,
			status,
		};
	}

	private hasStatus(state: InternalTaskState, status: TaskStatus): boolean {
		return state.record.status === status;
	}

	private emitEvent(event: TaskEvent): void {
		this.logger?.info('TaskManager', `${event.type} ${event.task.id} ${event.task.type}`);
		switch (event.type) {
			case 'task:created':
				this.eventBus.emit('task:created', event);
				break;
			case 'task:started':
				this.eventBus.emit('task:started', event);
				break;
			case 'task:updated':
				this.eventBus.emit('task:updated', event);
				break;
			case 'task:succeeded':
				this.eventBus.emit('task:succeeded', event);
				break;
			case 'task:failed':
				this.eventBus.emit('task:failed', event);
				break;
			case 'task:cancelled':
				this.eventBus.emit('task:cancelled', event);
				break;
		}
	}
}
