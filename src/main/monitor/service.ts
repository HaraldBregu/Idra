import { randomUUID } from 'node:crypto';
import type { AppEvent, AppEvents, Disposable, EventBus } from '../core';
import type {
	MonitorEventFilter,
	MonitorEventRecord,
	MonitorEventSeverity,
	MonitorSnapshot,
} from './types';

type MonitorLogger = {
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
};

export interface MonitorServiceOptions {
	eventBus: EventBus;
	logger?: MonitorLogger;
	maxRecords?: number;
	now?: () => string;
	idFactory?: () => string;
}

const DEFAULT_MAX_RECORDS = 500;
const MAX_STRING_LENGTH = 2_000;
const MAX_OBJECT_KEYS = 40;
const MAX_ARRAY_ITEMS = 40;
const MAX_DEPTH = 4;
const SECRET_KEY_PATTERN =
	/(api[_-]?key|authorization|credential|password|private[_-]?key|secret|token)/i;
const SECRET_VALUE_PATTERNS: readonly (readonly [RegExp, string])[] = [
	[/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, '[redacted private key]'],
	[/((?:authorization)\s*:\s*bearer\s+)[^\s,;]+/gi, '$1[redacted]'],
	[/((?:api[_-]?key|credential|password|secret|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]'],
];

const MONITORED_APP_EVENT_TYPE_MAP: Record<keyof AppEvents, true> = {
	'service:initialized': true,
	'service:destroyed': true,
	'error:critical': true,
	'window:created': true,
	'window:closed': true,
	'task:created': true,
	'task:started': true,
	'task:updated': true,
	'task:succeeded': true,
	'task:failed': true,
	'task:cancelled': true,
	'subagent:created': true,
	'subagent:started': true,
	'subagent:completed': true,
	'tray:set-enabled': true,
	'channel:status': true,
	'channel:route': true,
	'heartbeat:event': true,
};

export const MONITORED_APP_EVENT_TYPES = Object.keys(
	MONITORED_APP_EVENT_TYPE_MAP
) as Array<keyof AppEvents>;

function truncate(value: string): string {
	const redacted = SECRET_VALUE_PATTERNS.reduce(
		(next, [pattern, replacement]) => next.replace(pattern, replacement),
		value
	);
	if (redacted.length <= MAX_STRING_LENGTH) return redacted;
	return `${redacted.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeMonitorValue(
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
	if (value instanceof Error) {
		return {
			name: value.name,
			message: truncate(value.message),
			stack: value.stack ? truncate(value.stack) : undefined,
		};
	}
	if (depth >= MAX_DEPTH) return '[max depth]';
	if (typeof value !== 'object') return String(value);
	if (seen.has(value)) return '[circular]';

	seen.add(value);
	if (Array.isArray(value)) {
		const output = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => sanitizeMonitorValue(item, depth + 1, seen) ?? null);
		if (value.length > MAX_ARRAY_ITEMS) output.push('[truncated]');
		seen.delete(value);
		return output;
	}

	const output: Record<string, unknown> = {};
	const entries = Object.entries(value as Record<string, unknown>);
	for (const [key, item] of entries.slice(0, MAX_OBJECT_KEYS)) {
		const safeKey = truncate(key);
		if (SECRET_KEY_PATTERN.test(key)) {
			output[safeKey] = '[redacted]';
			continue;
		}
		const safeValue = sanitizeMonitorValue(item, depth + 1, seen);
		if (safeValue !== undefined) output[safeKey] = safeValue;
	}
	if (entries.length > MAX_OBJECT_KEYS) output.__truncated = true;
	seen.delete(value);
	return output;
}

function categoryForEvent(type: keyof AppEvents): string {
	const separator = type.indexOf(':');
	return separator > 0 ? type.slice(0, separator) : 'app';
}

function severityForEvent(type: keyof AppEvents): MonitorEventSeverity {
	if (type === 'error:critical' || type === 'task:failed') return 'error';
	if (type === 'task:cancelled') return 'warn';
	return 'info';
}

function cloneRecord(record: MonitorEventRecord): MonitorEventRecord {
	return JSON.parse(JSON.stringify(record)) as MonitorEventRecord;
}

function normalizeLimit(limit: number | undefined, fallback: number): number {
	if (!Number.isSafeInteger(limit) || limit === undefined || limit <= 0) return fallback;
	return limit;
}

export class MonitorService implements Disposable {
	private readonly records: MonitorEventRecord[] = [];
	private readonly maxRecords: number;
	private readonly now: () => string;
	private readonly idFactory: () => string;
	private readonly eventBus: EventBus;
	private readonly logger?: MonitorLogger;
	private disposers: Array<() => void> = [];
	private running = false;

	constructor(options: MonitorServiceOptions) {
		this.eventBus = options.eventBus;
		this.logger = options.logger;
		this.maxRecords =
			Number.isSafeInteger(options.maxRecords) && options.maxRecords && options.maxRecords > 0
				? options.maxRecords
				: DEFAULT_MAX_RECORDS;
		this.now = options.now ?? (() => new Date().toISOString());
		this.idFactory = options.idFactory ?? randomUUID;
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.disposers = MONITORED_APP_EVENT_TYPES.map((type) =>
			this.eventBus.on(type, (event) => this.recordEvent(type, event))
		);
		this.logger?.info('MonitorService', `Monitoring ${this.disposers.length} event types`);
	}

	list(filter: MonitorEventFilter = {}): MonitorEventRecord[] {
		const limit = normalizeLimit(filter.limit, this.maxRecords);
		return this.records
			.filter((record) => {
				if (filter.eventType && record.eventType !== filter.eventType) return false;
				if (filter.source && record.source !== filter.source) return false;
				if (filter.severity && record.severity !== filter.severity) return false;
				if (filter.category && record.category !== filter.category) return false;
				return true;
			})
			.slice(-limit)
			.map(cloneRecord);
	}

	get(id: string): MonitorEventRecord | undefined {
		const record = this.records.find((item) => item.id === id);
		return record ? cloneRecord(record) : undefined;
	}

	snapshot(filter: MonitorEventFilter = {}): MonitorSnapshot {
		return {
			records: this.list(filter),
			generatedAt: this.now(),
		};
	}

	destroy(): void {
		for (const dispose of this.disposers.splice(0)) dispose();
		if (this.running) this.logger?.info('MonitorService', 'Stopped monitoring events');
		this.running = false;
	}

	private recordEvent(type: keyof AppEvents, event: AppEvent): void {
		const record: MonitorEventRecord = {
			id: this.idFactory(),
			source: 'event-bus',
			eventType: type,
			category: categoryForEvent(type),
			severity: severityForEvent(type),
			observedAt: this.now(),
			eventTimestamp: event.timestamp,
			payload: sanitizeMonitorValue(event.payload),
		};
		this.records.push(record);
		if (this.records.length > this.maxRecords) {
			this.records.splice(0, this.records.length - this.maxRecords);
		}
	}
}
