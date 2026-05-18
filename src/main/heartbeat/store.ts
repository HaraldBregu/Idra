import type { HeartbeatStoreState } from '../../shared/heartbeat';

export function emptyHeartbeatStoreState(): HeartbeatStoreState {
	return {
		version: 1,
		taskState: {},
		lastDelivered: {},
	};
}

export function migrateHeartbeatStoreState(raw: unknown): HeartbeatStoreState {
	if (!raw || typeof raw !== 'object') return emptyHeartbeatStoreState();
	const record = raw as Partial<HeartbeatStoreState>;
	return {
		version: 1,
		taskState: sanitizeRecord(record.taskState, (value) => {
			const lastRunMs = readFiniteNumber(value, 'lastRunMs');
			return lastRunMs === undefined ? undefined : { lastRunMs };
		}),
		lastDelivered: sanitizeRecord(record.lastDelivered, (value) => {
			const text = readString(value, 'text');
			const atMs = readFiniteNumber(value, 'atMs');
			return text && atMs !== undefined ? { text, atMs } : undefined;
		}),
	};
}

function sanitizeRecord<T>(
	value: unknown,
	normalize: (value: unknown) => T | undefined
): Record<string, T> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const out: Record<string, T> = {};
	for (const [key, entry] of Object.entries(value)) {
		const normalized = normalize(entry);
		if (normalized !== undefined) out[key] = normalized;
	}
	return out;
}

function readFiniteNumber(value: unknown, key: string): number | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const raw = (value as Record<string, unknown>)[key];
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function readString(value: unknown, key: string): string | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const raw = (value as Record<string, unknown>)[key];
	return typeof raw === 'string' && raw.trim() ? raw : undefined;
}
