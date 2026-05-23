import { adaptAgentHarnessToV2, runAgentHarnessV2LifecycleAttempt } from './v2';
import { createPiAgentHarness } from './builtin-pi';
import { listRegisteredAgentHarnesses } from './registry';
import { ensureAgentHarnessRuntimeActivated } from './activation';
import { resolveAgentHarnessPolicy, type AgentHarnessPolicy } from './policy';
import { agentLogger } from '../logger';
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
	AgentHarnessCompactParams,
	AgentHarnessCompactResult,
	AgentHarnessSupport,
} from './types';

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

type AgentHarnessSelectionInput = {
	provider: string;
	modelId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
	policy?: AgentHarnessPolicy;
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

export function selectAgentHarness(params: AgentHarnessSelectionInput): AgentHarness {
	return selectAgentHarnessDecision(params).harness;
}

function selectAgentHarnessDecision(params: AgentHarnessSelectionInput): AgentHarnessSelectionDecision {
	const policy = params.policy ?? resolveAgentHarnessPolicy({
		requestedRuntime: params.requestedRuntime,
		storedRuntime: params.storedRuntime,
	});
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
		.sort(compareHarnessSupport);

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
	const selection = selectAgentHarnessDecision({
		provider: params.provider,
		modelId: params.model,
		requestedRuntime: params.requestedRuntime,
		storedRuntime: params.storedRuntime,
		policy,
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

export async function maybeCompactAgentHarnessSession(
	params: { provider?: string; modelId?: string; sessionKey?: string } & AgentHarnessCompactParams
): Promise<AgentHarnessCompactResult | undefined> {
	const harness = selectAgentHarness({
		provider: params.provider ?? '',
		modelId: params.modelId,
	});
	if (!harness.compact) {
		if (harness.id !== 'pi') {
			return { ok: false, compacted: false, reason: `Agent harness "${harness.id}" does not support compaction.` };
		}
		return undefined;
	}
	return harness.compact(params);
}
