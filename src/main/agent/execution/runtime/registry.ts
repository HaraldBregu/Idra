import type { AgentRuntime, AgentRuntimeAttemptParams, AgentRuntimeAttemptResult, AgentRuntimeSupportDecision } from './types';

export type AgentRuntimeLifecycleHookName = 'before_agent_start' | 'after_tool_call' | 'before_message_write' | 'llm_input' | 'llm_output' | 'agent_end';
export type AgentRuntimeLifecycleHookHandler = (payload: Record<string, unknown>) => void | Promise<void>;
const runtimes = new Map<string, AgentRuntime>();
const hooks = new Map<AgentRuntimeLifecycleHookName, Set<AgentRuntimeLifecycleHookHandler>>();

export function registerAgentRuntime(runtime: AgentRuntime): () => void {
	runtimes.set(runtime.id, runtime);
	return () => runtimes.delete(runtime.id);
}
export function clearRegisteredAgentRuntimes(): void { runtimes.clear(); }
export function selectAgentRuntime(input: { provider: string; modelId: string; requestedRuntime?: string }): AgentRuntime {
	if (input.requestedRuntime) {
		const runtime = runtimes.get(input.requestedRuntime);
		if (!runtime) throw new Error(`Requested agent runtime "${input.requestedRuntime}" is not registered.`);
		return runtime;
	}
	const selected = [...runtimes.values()].map((runtime) => ({ runtime, decision: runtime.supports(input) })).filter((entry) => entry.decision.supported).sort((a, b) => (b.decision.priority ?? 0) - (a.decision.priority ?? 0) || a.runtime.id.localeCompare(b.runtime.id))[0]?.runtime;
	if (!selected) throw new Error('No agent runtime is registered.');
	return selected;
}
export async function resetRegisteredAgentRuntimes(input: { reason: string }): Promise<void> {
	await Promise.all([...runtimes.values()].map(async (runtime) => {
		try {
			await runtime.reset?.(input);
		} catch {
			return;
		}
	}));
}
export function adaptAgentRuntimeToV2(runtime: AgentRuntime): AgentRuntime { return runtime; }
export async function runAgentRuntimeV2LifecycleAttempt(runtime: AgentRuntime, params: AgentRuntimeAttemptParams): Promise<AgentRuntimeAttemptResult> {
	await emitAgentRuntimeLifecycleHook('before_agent_start', { runId: params.runId, userMessage: params.userMessage, provider: params.provider, modelId: params.model });
	const result = await runtime.runAttempt(params);
	const stamped = { ...result, agentRuntimeId: runtime.id };
	const classification = runtime.classify?.(stamped, params);
	return classification ? { ...stamped, agentRuntimeResultClassification: classification } : stamped;
}
export function registerAgentRuntimeHookHandler(name: AgentRuntimeLifecycleHookName, handler: AgentRuntimeLifecycleHookHandler): () => void {
	const set = hooks.get(name) ?? new Set();
	set.add(handler);
	hooks.set(name, set);
	return () => set.delete(handler);
}
export function clearAgentRuntimeHookProviders(): void { hooks.clear(); }
export async function emitAgentRuntimeLifecycleHook(name: AgentRuntimeLifecycleHookName, payload: Record<string, unknown>): Promise<void> {
	for (const handler of hooks.get(name) ?? []) await handler(payload);
}
export async function maybeCompactAgentRuntimeSession(params: { requestedRuntime?: string; provider: string; modelId: string; sessionKey: string }): Promise<unknown> {
	const runtime = selectAgentRuntime({ provider: params.provider, modelId: params.modelId, requestedRuntime: params.requestedRuntime });
	return runtime.compact?.(params);
}
export function collectConfiguredAgentRuntimes(config: unknown, env: Record<string, string | undefined> = process.env): string[] {
	const found = new Set<string>();
	const visitRuntimeOptions = (value: unknown): void => {
		if (!value || typeof value !== 'object') return;
		for (const key of ['agentRuntime', 'agentRuntimeId']) {
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
export function supportDecision(supported: boolean, priority?: number, reason?: string): AgentRuntimeSupportDecision {
	return { supported, priority, reason };
}
