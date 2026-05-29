import type { HeartbeatWakeIntent, HeartbeatWakeSource } from '../../shared/heartbeat';

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
