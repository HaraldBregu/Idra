import { agentLogger } from '../logger';
import { createPiAgentHarness } from './builtin-pi';
import { ensureAgentHarnessRuntimeActivated } from './activation';
import { runAgentHarnessV2LifecycleAttempt } from './v2';
import { getRegisteredHarnesses } from './registry';
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
	AgentHarnessCompactParams,
	AgentHarnessSupportDecision,
} from './types';

type AgentHarnessPolicy = {
	runtime: string;
	runtimeSource?: 'request' | 'store' | 'default';
};

function normalizeRuntime(input: unknown): string {
	return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function resolveAgentHarnessPolicy(params: {
	requestedRuntime?: string;
	storedRuntime?: string;
}): AgentHarnessPolicy {
	const requested = normalizeRuntime(params.requestedRuntime);
	if (requested) {
		return { runtime: requested, runtimeSource: 'request' };
	}
	const stored = normalizeRuntime(params.storedRuntime);
	if (stored) {
		return { runtime: stored, runtimeSource: 'store' };
	}
	return { runtime: 'auto', runtimeSource: 'default' };
}

export function selectAgentHarness(input: {
	provider: string;
	modelId: string;
	requestedRuntime?: string;
	storedRuntime?: string;
}): AgentHarness {
	const policy = resolveAgentHarnessPolicy({
		requestedRuntime: input.requestedRuntime,
		storedRuntime: input.storedRuntime,
	});
	const runtime = policy.runtime;
	const pluginHarnesses = getRegisteredHarnesses();

	if (runtime === 'pi') {
		return createPiAgentHarness();
	}

	if (runtime !== 'auto') {
		const forced = pluginHarnesses.find((h) => h.id === runtime);
		if (!forced) throw new Error(`Requested agent harness "${runtime}" is not registered.`);
		const decision = getSupport(forced, input);
		if (!decision.supported) {
			throw new Error(decision.reason ?? `Requested agent harness "${runtime}" does not support this model.`);
		}
		return forced;
	}

	const supported = pluginHarnesses
		.map((harness) => ({ harness, decision: getSupport(harness, input) }))
		.filter((entry) => entry.decision.supported)
		.sort((a, b) => {
			const delta = (b.decision.priority ?? 0) - (a.decision.priority ?? 0);
			return delta || a.harness.id.localeCompare(b.harness.id);
		});

	return supported[0]?.harness ?? createPiAgentHarness();
}

export async function runAgentHarnessAttempt(
	params: AgentHarnessAttemptParams & { requestedRuntime?: string; storedRuntime?: string }
): Promise<AgentHarnessAttemptResult> {
	const policy = resolveAgentHarnessPolicy({
		requestedRuntime: params.requestedRuntime,
		storedRuntime: params.storedRuntime,
	});
	await ensureAgentHarnessRuntimeActivated({
		runtime: policy.runtime,
		provider: params.provider,
		modelId: params.model,
	});
	const harness = selectAgentHarness({
		provider: params.provider,
		modelId: params.model,
		requestedRuntime: params.requestedRuntime,
		storedRuntime: params.storedRuntime,
	});
	agentLogger.debug('agents/harness', 'agent harness selected', {
		runtime: policy.runtime,
		harnessId: harness.id,
		provider: params.provider,
		model: params.model,
	});
	return runAgentHarnessV2LifecycleAttempt(harness, params);
}

export async function maybeCompactAgentHarnessSession(params: AgentHarnessCompactParams): Promise<unknown> {
	if (!params.requestedRuntime) return undefined;
	const harness = selectAgentHarness({
		provider: params.provider,
		modelId: params.modelId,
		requestedRuntime: params.requestedRuntime,
	});
	return harness.compact?.(params);
}

function getSupport(
	harness: AgentHarness,
	input: { provider: string; modelId: string }
): AgentHarnessSupportDecision {
	return harness.supports?.(input) ?? { supported: true };
}
