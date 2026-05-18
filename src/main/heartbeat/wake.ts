import type {
	HeartbeatRunResult,
	HeartbeatWakeIntent,
	HeartbeatWakeOverride,
	HeartbeatWakeRequest,
	HeartbeatWakeSource,
} from '../../shared/heartbeat';

export const HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT = 'requests-in-flight';
export const HEARTBEAT_SKIP_CRON_IN_PROGRESS = 'cron-in-progress';
export const HEARTBEAT_SKIP_LANES_BUSY = 'lanes-busy';

const RETRYABLE_BUSY_SKIP_REASONS = new Set([
	HEARTBEAT_SKIP_REQUESTS_IN_FLIGHT,
	HEARTBEAT_SKIP_CRON_IN_PROGRESS,
	HEARTBEAT_SKIP_LANES_BUSY,
]);

export function isRetryableHeartbeatBusySkipReason(reason: string): boolean {
	return RETRYABLE_BUSY_SKIP_REASONS.has(reason);
}

export type HeartbeatWakeHandler = (opts: HeartbeatWakeRequest) => Promise<HeartbeatRunResult>;

let heartbeatsEnabled = true;
let handler: HeartbeatWakeHandler | null = null;
let handlerGeneration = 0;
let timer: NodeJS.Timeout | null = null;
let timerDueAt: number | null = null;
let timerKind: 'normal' | 'retry' | null = null;
let running = false;
let scheduled = false;

const pendingWakes = new Map<string, PendingWake>();
const DEFAULT_COALESCE_MS = 250;
const DEFAULT_RETRY_MS = 1_000;

interface PendingWake {
	source: HeartbeatWakeSource;
	intent: HeartbeatWakeIntent;
	reason: string;
	priority: number;
	requestedAt: number;
	agentId?: string;
	sessionKey?: string;
	heartbeat?: HeartbeatWakeOverride;
}

export function setHeartbeatsEnabled(enabled: boolean): void {
	heartbeatsEnabled = enabled;
}

export function areHeartbeatsEnabled(): boolean {
	return heartbeatsEnabled;
}

function normalizeString(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

function normalizeReason(reason?: string): string {
	return reason?.trim() || 'heartbeat wake';
}

function wakeKey(wake: { agentId?: string; sessionKey?: string }): string {
	return `${normalizeString(wake.agentId) ?? ''}::${normalizeString(wake.sessionKey) ?? ''}`;
}

function priority(source: HeartbeatWakeSource, intent: HeartbeatWakeIntent, reason: string): number {
	if (intent === 'manual' || intent === 'immediate') return 3;
	if (source === 'retry' || reason === 'retry') return 0;
	if (source === 'interval' || intent === 'scheduled' || reason === 'interval') return 1;
	return 2;
}

function queueWake(request: HeartbeatWakeRequest): void {
	const reason = normalizeReason(request.reason);
	const next: PendingWake = {
		source: request.source,
		intent: request.intent,
		reason,
		priority: priority(request.source, request.intent, reason),
		requestedAt: Date.now(),
		agentId: normalizeString(request.agentId),
		sessionKey: normalizeString(request.sessionKey),
		heartbeat: request.heartbeat,
	};
	const key = wakeKey(next);
	const previous = pendingWakes.get(key);
	if (!previous) {
		pendingWakes.set(key, next);
		return;
	}
	const newer = next.requestedAt >= previous.requestedAt ? next : previous;
	const higher = next.priority > previous.priority ? next : previous;
	pendingWakes.set(key, {
		...(next.priority === previous.priority ? newer : higher),
		heartbeat: next.heartbeat ?? previous.heartbeat,
		requestedAt: Math.max(next.requestedAt, previous.requestedAt),
	});
}

function schedule(delayMs: number, kind: 'normal' | 'retry' = 'normal'): void {
	const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : DEFAULT_COALESCE_MS;
	const dueAt = Date.now() + delay;
	if (timer) {
		if (timerKind === 'retry') return;
		if (timerDueAt !== null && timerDueAt <= dueAt) return;
		clearTimeout(timer);
	}
	timerDueAt = dueAt;
	timerKind = kind;
	timer = setTimeout(async () => {
		timer = null;
		timerDueAt = null;
		timerKind = null;
		scheduled = false;
		const active = handler;
		if (!active) return;
		if (running) {
			scheduled = true;
			schedule(delay, kind);
			return;
		}

		const batch = [...pendingWakes.values()];
		pendingWakes.clear();
		running = true;
		try {
			for (const pending of batch) {
				const wake: HeartbeatWakeRequest = {
					source: pending.source,
					intent: pending.intent,
					reason: pending.reason,
					agentId: pending.agentId,
					sessionKey: pending.sessionKey,
					heartbeat: pending.heartbeat,
				};
				const result = await active(wake);
				if (result.status === 'skipped' && isRetryableHeartbeatBusySkipReason(result.reason)) {
					queueWake({ ...wake, source: 'retry', reason: result.reason });
					schedule(DEFAULT_RETRY_MS, 'retry');
				}
			}
		} catch {
			for (const pending of batch) {
				queueWake({
					source: 'retry',
					intent: pending.intent,
					reason: pending.reason || 'retry',
					agentId: pending.agentId,
					sessionKey: pending.sessionKey,
					heartbeat: pending.heartbeat,
				});
			}
			schedule(DEFAULT_RETRY_MS, 'retry');
		} finally {
			running = false;
			if (pendingWakes.size > 0 || scheduled) schedule(delay, 'normal');
		}
	}, delay);
	timer.unref?.();
}

export function setHeartbeatWakeHandler(next: HeartbeatWakeHandler | null): () => void {
	handlerGeneration++;
	const generation = handlerGeneration;
	handler = next;
	if (timer) clearTimeout(timer);
	timer = null;
	timerDueAt = null;
	timerKind = null;
	running = false;
	scheduled = false;
	if (handler && pendingWakes.size > 0) schedule(DEFAULT_COALESCE_MS, 'normal');
	return () => {
		if (handlerGeneration !== generation) return;
		handler = null;
		if (timer) clearTimeout(timer);
		timer = null;
		timerDueAt = null;
		timerKind = null;
		running = false;
		scheduled = false;
	};
}

export function requestHeartbeat(request: HeartbeatWakeRequest): void {
	queueWake(request);
	schedule(request.coalesceMs ?? DEFAULT_COALESCE_MS, 'normal');
}

export function resetHeartbeatWakeForTest(): void {
	if (timer) clearTimeout(timer);
	timer = null;
	timerDueAt = null;
	timerKind = null;
	handler = null;
	handlerGeneration = 0;
	pendingWakes.clear();
	running = false;
	scheduled = false;
	heartbeatsEnabled = true;
}
