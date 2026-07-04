import type { Agent } from '../agent';
import { runHealthCheck } from './health_run';
import { getHealthSettings } from './health_store';
import type { HealthEvery } from './health_types';

const INTERVAL_MS: Record<HealthEvery, number> = {
	'0m': 0,
	'1m': 60_000,
	'30m': 1_800_000,
	'1h': 3_600_000,
};

let timer: ReturnType<typeof setInterval> | undefined;
let healthAgent: Agent | undefined;

export function startHealth(agent: Agent): void {
	healthAgent = agent;
	schedule();
}

export function stopHealth(): void {
	if (timer) clearInterval(timer);
	timer = undefined;
	healthAgent = undefined;
}

export function rescheduleHealth(): void {
	if (healthAgent) schedule();
}

function schedule(): void {
	if (timer) clearInterval(timer);
	timer = undefined;
	const agent = healthAgent;
	const ms = INTERVAL_MS[getHealthSettings().every] ?? 0;
	if (!ms || !agent) return;
	timer = setInterval(() => {
		runHealthCheck(agent).catch((error) => {
			console.error('[Health]', 'Health check failed', error);
		});
	}, ms);
	timer.unref();
}
