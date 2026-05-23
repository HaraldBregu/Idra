import { adaptAgentHarnessToV2, runAgentHarnessV2LifecycleAttempt } from './v2';
import { createPiAgentHarness } from './builtin-pi';
import { listRegisteredAgentHarnesses } from './registry';
import { resolveAgentHarnessPolicy, type AgentHarnessPolicy } from './policy';
import { agentLogger } from '../logger';
import type { AgentHarness, AgentHarnessAttemptParams, AgentHarnessSupport } from './types';

type AgentHarnessSelectionCandidate = {
	id: string;
	label: string;
	pluginId?: string;
	supported?: boolean;
	priority?: number;
	reason?: string;
};

type AgentHarnessSelectionDecision = {
	harness: AgentHarness;
	policy: AgentHarnessPolicy;
	selectedHarnessId: string;
	candidates: AgentHarnessSelectionCandidate[];
	selectedReason: 'forced_pi' | 'forced_plugin' | 'auto_plugin' | 'auto_pi';
};

function listPluginAgentHarnesses(): AgentHarness[] {
	return listRegisteredAgentHarnesses().map((entry) => entry.harness);
}

function compareHarnessSupport(
	left: { harness: AgentHarness; support: AgentHarnessSupport & { supported: true } },
	right: { harness: AgentHarness; support: AgentHarnessSupport & { supported: true } }
): number {
	const delta = (right.support.priority ?? 0) - (left.support.priority ?? 0);
	if (delta !== 0) return delta;
	return left.harness.id.localeCompare(right.harness.id);
}

export function selectAgentHarness(params: {
	provider: string;
	modelId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
}): AgentHarness {
	return selectAgentHarnessDecision(params).harness;
}

function selectAgentHarnessDecision(params: {
	provider: string;
	modelId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
}): AgentHarnessSelectionDecision {
	const policy = resolveAgentHarnessPolicy(params);
	const pluginHarnesses = listPluginAgentHarnesses();
	const piHarness = createPiAgentHarness();
	const runtime = policy.runtime;

	if (runtime === 'pi') {
		return buildSelectionDecision({
			harness: piHarness,
			policy,
			selectedReason: 'forced_pi',
			candidates: listHarnessCandidates(pluginHarnesses),
		});
	}

	if (runtime !== 'auto') {
		const forced = pluginHarnesses.find((entry) => entry.id === runtime);
		if (!forced) {
			throw new Error(`Requested agent harness "${runtime}" is not registered.`);
		}
		return buildSelectionDecision({
			harness: forced,
			policy,
			selectedReason: 'forced_plugin',
			candidates: listHarnessCandidates(pluginHarnesses),
		});
	}

	const candidates = pluginHarnesses.map((harness) => ({
		harness,
		support: harness.supports({
			provider: params.provider,
			modelId: params.modelId,
			requestedRuntime: runtime,
		}),
	}));
	const supported = candidates
		.filter(
			(entry): entry is { harness: AgentHarness; support: AgentHarnessSupport & { supported: true } } =>
				entry.support.supported
		)
		.toSorted(compareHarnessSupport);

	const selected = supported[0]?.harness;
	if (selected) {
		return buildSelectionDecision({
			harness: selected,
			policy,
			selectedReason: 'auto_plugin',
			candidates: candidates.map(toSelectionCandidate),
		});
	}

	return buildSelectionDecision({
		harness: piHarness,
		policy,
		selectedReason: 'auto_pi',
		candidates: candidates.map(toSelectionCandidate),
	});
}

export async function runAgentHarnessAttempt(
	params: AgentHarnessAttemptParams & { requestedRuntime?: string; storedRuntime?: string }
): Promise<Awaited<ReturnType<typeof runAgentHarnessV2LifecycleAttempt>>> {
	const selection = selectAgentHarnessDecision({
		provider: params.provider,
		modelId: params.model,
		requestedRuntime: params.requestedRuntime,
		storedRuntime: params.storedRuntime,
	});
	agentLogger.debug('agents/harness', 'agent harness selected', {
		runtime: selection.policy.runtime,
		selectedHarnessId: selection.selectedHarnessId,
		selectedReason: selection.selectedReason,
		provider: params.provider,
		model: params.model,
		candidates: selection.candidates,
	});
	const harness = adaptAgentHarnessToV2(selection.harness);
	return runAgentHarnessV2LifecycleAttempt(harness, params);
}

function listHarnessCandidates(harnesses: AgentHarness[]): AgentHarnessSelectionCandidate[] {
	return harnesses.map((harness) => ({
		id: harness.id,
		label: harness.label,
		pluginId: harness.pluginId,
	}));
}

function toSelectionCandidate(entry: {
	harness: AgentHarness;
	support: AgentHarnessSupport;
}): AgentHarnessSelectionCandidate {
	return {
		id: entry.harness.id,
		label: entry.harness.label,
		pluginId: entry.harness.pluginId,
		supported: entry.support.supported,
		priority: entry.support.supported ? entry.support.priority : undefined,
		reason: entry.support.reason,
	};
}

function buildSelectionDecision(params: {
	harness: AgentHarness;
	policy: AgentHarnessPolicy;
	selectedHarnessId: string;
	selectedReason: AgentHarnessSelectionDecision['selectedReason'];
	candidates: AgentHarnessSelectionCandidate[];
}): AgentHarnessSelectionDecision {
	return {
		harness: params.harness,
		policy: params.policy,
		selectedHarnessId: params.harness.id,
		selectedReason: params.selectedReason,
		candidates: params.candidates,
	};
}
