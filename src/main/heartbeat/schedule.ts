import { createHash } from 'node:crypto';
import os from 'node:os';
import { isWithinActiveHours } from './active-hours';
import type { AgentHeartbeatConfig } from '../../shared/heartbeat';

const MAX_TIMEOUT_MS = 2_147_483_647;
const MAX_SEEK_HORIZON_MS = 7 * 24 * 60 * 60_000;
const MAX_SEEK_ITERATIONS = 10_080;

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
