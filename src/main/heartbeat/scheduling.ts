import { createHash } from 'node:crypto';
import os from 'node:os';
import type {
	AgentHeartbeatConfig,
	HeartbeatRunResult,
	HeartbeatWakeIntent,
	HeartbeatWakeOverride,
	HeartbeatWakeRequest,
	HeartbeatWakeSource,
} from '../../shared/heartbeat';

const ACTIVE_HOURS_TIME_RE = /^(?:([01]\d|2[0-3]):([0-5]\d)|24:00)$/;
const DURATION_TOKEN_RE = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gi;
const UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 60 * 60_000,
	d: 24 * 60 * 60_000,
};
const MAX_TIMEOUT_MS = 2_147_483_647;
const MAX_SEEK_HORIZON_MS = 7 * 24 * 60 * 60_000;
const MAX_SEEK_ITERATIONS = 10_080;

export const DEFAULT_MIN_WAKE_SPACING_MS = 30_000;
export const DEFAULT_FLOOD_WINDOW_MS = 60_000;
export const DEFAULT_FLOOD_THRESHOLD = 5;

export type DeferDecision =
	| { defer: false }
	| { defer: true; reason: 'not-due' | 'min-spacing' | 'flood' };

export interface ShouldDeferInput {
	intent: HeartbeatWakeIntent;
	source?: HeartbeatWakeSource;
	reason?: string;
	now: number;
	nextDueMs: number;
	lastRunStartedAtMs?: number;
	recentRunStarts?: readonly number[];
	minSpacingMs?: number;
	floodWindowMs?: number;
	floodThreshold?: number;
}

export function parseHeartbeatDurationMs(raw: string | undefined, defaultUnit = 'm'): number | null {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
		const unitMs = UNIT_MS[defaultUnit] ?? UNIT_MS.m;
		const value = Number(trimmed) * unitMs;
		return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
	}

	let total = 0;
	let consumed = '';
	for (const match of trimmed.matchAll(DURATION_TOKEN_RE)) {
		const value = Number(match[1]);
		const unit = match[2]?.toLowerCase() ?? defaultUnit;
		const unitMs = UNIT_MS[unit];
		if (!Number.isFinite(value) || !unitMs) return null;
		total += value * unitMs;
		consumed += match[0];
	}

	if (consumed.replace(/\s+/g, '') !== trimmed.replace(/\s+/g, '')) return null;
	return Number.isFinite(total) && total > 0 ? Math.floor(total) : null;
}

function parseActiveHoursTime(raw: string | undefined, allow24: boolean): number | null {
	if (!raw || !ACTIVE_HOURS_TIME_RE.test(raw)) return null;
	const [hourStr, minuteStr] = raw.split(':');
	const hour = Number(hourStr);
	const minute = Number(minuteStr);
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
	if (hour === 24) return allow24 && minute === 0 ? 24 * 60 : null;
	return hour * 60 + minute;
}

export function resolveActiveHoursTimezone(raw?: string): string {
	const trimmed = raw?.trim();
	if (!trimmed || trimmed === 'local' || trimmed === 'user') {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	}
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
		return trimmed;
	} catch {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	}
}

function resolveMinutesInTimeZone(nowMs: number, timeZone: string): number | null {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		}).formatToParts(new Date(nowMs));
		const map: Record<string, string> = {};
		for (const part of parts) {
			if (part.type !== 'literal') map[part.type] = part.value;
		}
		const hour = Number(map.hour);
		const minute = Number(map.minute);
		return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
	} catch {
		return null;
	}
}

export function isWithinActiveHours(
	activeHours: AgentHeartbeatConfig['activeHours'] | undefined,
	nowMs = Date.now()
): boolean {
	if (!activeHours) return true;
	const startMin = parseActiveHoursTime(activeHours.start, false);
	const endMin = parseActiveHoursTime(activeHours.end, true);
	if (startMin === null || endMin === null) return true;
	if (startMin === endMin) return false;
	const currentMin = resolveMinutesInTimeZone(nowMs, resolveActiveHoursTimezone(activeHours.timezone));
	if (currentMin === null) return true;
	if (endMin > startMin) return currentMin >= startMin && currentMin < endMin;
	return currentMin >= startMin || currentMin < endMin;
}

export function activeHoursIdentity(activeHours: AgentHeartbeatConfig['activeHours'] | undefined): string {
	if (!activeHours) return '';
	return [activeHours.start ?? '', activeHours.end ?? '', activeHours.timezone ?? ''].join('|');
}

function normalizeModulo(value: number, divisor: number): number {
	return ((value % divisor) + divisor) % divisor;
}

export function resolveHeartbeatSchedulerSeed(cwd = process.cwd()): string {
	const host = os.hostname();
	const home = os.homedir();
	return [host, home, cwd].filter(Boolean).join(':') || cwd;
}

export function resolveHeartbeatPhaseMs(params: {
	schedulerSeed: string;
	agentId: string;
	intervalMs: number;
}): number {
	const intervalMs = Math.max(1, Math.floor(params.intervalMs));
	const digest = createHash('sha256').update(`${params.schedulerSeed}:${params.agentId}`).digest();
	return digest.readUInt32BE(0) % intervalMs;
}

export function computeNextHeartbeatPhaseDueMs(params: {
	nowMs: number;
	intervalMs: number;
	phaseMs: number;
}): number {
	const intervalMs = Math.max(1, Math.floor(params.intervalMs));
	const nowMs = Math.floor(params.nowMs);
	const phaseMs = normalizeModulo(Math.floor(params.phaseMs), intervalMs);
	const cyclePositionMs = normalizeModulo(nowMs, intervalMs);
	let deltaMs = normalizeModulo(phaseMs - cyclePositionMs, intervalMs);
	if (deltaMs === 0) deltaMs = intervalMs;
	return nowMs + deltaMs;
}

export function resolveNextHeartbeatDueMs(params: {
	nowMs: number;
	intervalMs: number;
	phaseMs: number;
	prev?: {
		intervalMs: number;
		phaseMs: number;
		nextDueMs: number;
		activeHoursKey?: string;
	};
	activeHoursKey?: string;
}): number {
	const intervalMs = Math.max(1, Math.floor(params.intervalMs));
	const phaseMs = normalizeModulo(Math.floor(params.phaseMs), intervalMs);
	const prev = params.prev;
	if (
		prev &&
		prev.intervalMs === intervalMs &&
		prev.phaseMs === phaseMs &&
		prev.activeHoursKey === params.activeHoursKey &&
		prev.nextDueMs > params.nowMs
	) {
		return prev.nextDueMs;
	}
	return computeNextHeartbeatPhaseDueMs({ nowMs: params.nowMs, intervalMs, phaseMs });
}

export function seekNextActivePhaseDueMs(params: {
	startMs: number;
	intervalMs: number;
	activeHours?: AgentHeartbeatConfig['activeHours'];
}): number {
	if (!params.activeHours) return params.startMs;
	const intervalMs = Math.max(1, Math.floor(params.intervalMs));
	const horizonMs = params.startMs + MAX_SEEK_HORIZON_MS;
	let candidateMs = params.startMs;
	let iterations = 0;
	while (candidateMs <= horizonMs && iterations < MAX_SEEK_ITERATIONS) {
		if (isWithinActiveHours(params.activeHours, candidateMs)) return candidateMs;
		candidateMs += intervalMs;
		iterations++;
	}
	return params.startMs;
}

export function safeHeartbeatTimeoutDelay(targetMs: number, nowMs = Date.now()): number {
	return Math.max(0, Math.min(MAX_TIMEOUT_MS, targetMs - nowMs));
}

export function shouldDeferWake(input: ShouldDeferInput): DeferDecision {
	if (input.intent === 'manual') return { defer: false };
	if (input.intent === 'immediate') return checkFloodGuard(input) ?? { defer: false };

	const flood = checkFloodGuard(input);
	if (flood) return flood;

	if (input.intent === 'scheduled') {
		return input.now < input.nextDueMs ? { defer: true, reason: 'not-due' } : { defer: false };
	}

	if (input.lastRunStartedAtMs === undefined) return { defer: false };
	if (input.now < input.nextDueMs) return { defer: true, reason: 'not-due' };

	const minSpacingMs = input.minSpacingMs ?? DEFAULT_MIN_WAKE_SPACING_MS;
	if (minSpacingMs > 0 && input.now - input.lastRunStartedAtMs < minSpacingMs) {
		return { defer: true, reason: 'min-spacing' };
	}
	return { defer: false };
}

function checkFloodGuard(input: ShouldDeferInput): DeferDecision | null {
	const floodWindowMs = input.floodWindowMs ?? DEFAULT_FLOOD_WINDOW_MS;
	const floodThreshold = input.floodThreshold ?? DEFAULT_FLOOD_THRESHOLD;
	if (!input.recentRunStarts || floodWindowMs <= 0 || input.recentRunStarts.length < floodThreshold) {
		return null;
	}
	const windowStart = input.now - floodWindowMs;
	let count = 0;
	for (let idx = input.recentRunStarts.length - 1; idx >= 0; idx--) {
		const ts = input.recentRunStarts[idx];
		if (ts === undefined || ts < windowStart) break;
		count++;
	}
	return count >= floodThreshold ? { defer: true, reason: 'flood' } : null;
}

export function recordRunStart(
	buffer: number[],
	ts: number,
	floodThreshold = DEFAULT_FLOOD_THRESHOLD
): number[] {
	buffer.push(ts);
	while (buffer.length > floodThreshold + 1) buffer.shift();
	return buffer;
}

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
