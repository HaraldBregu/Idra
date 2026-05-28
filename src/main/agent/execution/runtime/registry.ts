import type { AgentHarness, AgentHarnessAttemptParams, AgentHarnessAttemptResult, AgentHarnessSupportDecision } from './types';

export type AgentHarnessLifecycleHookName = 'before_agent_start' | 'after_tool_call' | 'before_message_write' | 'llm_input' | 'llm_output' | 'agent_end';
export type AgentHarnessLifecycleHookHandler = (payload: Record<string, unknown>) => void | Promise<void>;
const harnesses = new Map<string, AgentHarness>();
const hooks = new Map<AgentHarnessLifecycleHookName, Set<AgentHarnessLifecycleHookHandler>>();

export function registerAgentHarness(harness: AgentHarness): () => void {
	harnesses.set(harness.id, harness);
	return () => harnesses.delete(harness.id);
}
export function clearRegisteredAgentHarnesses(): void { harnesses.clear(); }
export function selectAgentHarness(input: { provider: string; modelId: string; requestedRuntime?: string }): AgentHarness {
	if (input.requestedRuntime) {
		const harness = harnesses.get(input.requestedRuntime);
		if (!harness) throw new Error(`Requested agent harness "${input.requestedRuntime}" is not registered.`);
		return harness;
	}
	const selected = [...harnesses.values()].map((harness) => ({ harness, decision: harness.supports(input) })).filter((entry) => entry.decision.supported).sort((a, b) => (b.decision.priority ?? 0) - (a.decision.priority ?? 0) || a.harness.id.localeCompare(b.harness.id))[0]?.harness;
	if (!selected) throw new Error('No agent harness is registered.');
	return selected;
}
export async function resetRegisteredAgentHarnesses(input: { reason: string }): Promise<void> {
	await Promise.all([...harnesses.values()].map(async (harness) => {
		try {
			await harness.reset?.(input);
		} catch {
			return;
		}
	}));
}
export function adaptAgentHarnessToV2(harness: AgentHarness): AgentHarness { return harness; }
export async function runAgentHarnessV2LifecycleAttempt(harness: AgentHarness, params: AgentHarnessAttemptParams): Promise<AgentHarnessAttemptResult> {
	await emitAgentHarnessLifecycleHook('before_agent_start', { runId: params.runId, userMessage: params.userMessage, provider: params.provider, modelId: params.model });
	const result = await harness.runAttempt(params);
	const stamped = { ...result, agentHarnessId: harness.id };
	const classification = harness.classify?.(stamped, params);
	return classification ? { ...stamped, agentHarnessResultClassification: classification } : stamped;
}
export function registerAgentHarnessHookHandler(name: AgentHarnessLifecycleHookName, handler: AgentHarnessLifecycleHookHandler): () => void {
	const set = hooks.get(name) ?? new Set();
	set.add(handler);
	hooks.set(name, set);
	return () => set.delete(handler);
}
export function clearAgentHarnessHookProviders(): void { hooks.clear(); }
export async function emitAgentHarnessLifecycleHook(name: AgentHarnessLifecycleHookName, payload: Record<string, unknown>): Promise<void> {
	for (const handler of hooks.get(name) ?? []) await handler(payload);
}
export async function maybeCompactAgentHarnessSession(params: { requestedRuntime?: string; provider: string; modelId: string; sessionKey: string }): Promise<unknown> {
	const harness = selectAgentHarness({ provider: params.provider, modelId: params.modelId, requestedRuntime: params.requestedRuntime });
	return harness.compact?.(params);
}
export function collectConfiguredAgentHarnessRuntimes(config: unknown, env: Record<string, string | undefined> = process.env): string[] {
	const found = new Set<string>();
	const visitRuntimeOptions = (value: unknown): void => {
		if (!value || typeof value !== 'object') return;
		for (const key of ['agentRuntime', 'agentHarnessId']) {
			const entry = (value as Record<string, unknown>)[key];
			if (typeof entry === 'string' && entry.trim()) found.add(entry.trim());
		}
	};
	const record = config && typeof config === 'object' && !Array.isArray(config) ? config as Record<string, unknown> : {};
	visitRuntimeOptions((record.assistant as Record<string, unknown> | undefined)?.options);
	if (Array.isArray(record.agents)) {
		for (const agent of record.agents) {
			visitRuntimeOptions((agent as Record<string, unknown> | undefined)?.options);
		}
	}
	if (env.FRIDAY_AGENT_RUNTIME?.trim()) found.add(env.FRIDAY_AGENT_RUNTIME.trim());
	return [...found];
}
export function supportDecision(supported: boolean, priority?: number, reason?: string): AgentHarnessSupportDecision {
	return { supported, priority, reason };
}
