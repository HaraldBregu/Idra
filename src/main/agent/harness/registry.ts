import type { AgentHarness } from './types';

const AGENT_HARNESS_REGISTRY_STATE = Symbol.for('friday.agentHarnessRegistryState');

interface RegistryState {
	harnesses: Map<string, AgentHarness>;
}

function getRegistryState(): RegistryState {
	const g = globalThis as typeof globalThis & { [AGENT_HARNESS_REGISTRY_STATE]?: RegistryState };
	g[AGENT_HARNESS_REGISTRY_STATE] ??= { harnesses: new Map() };
	return g[AGENT_HARNESS_REGISTRY_STATE];
}

export function registerAgentHarness(harness: AgentHarness): () => void {
	const { harnesses } = getRegistryState();
	harnesses.set(harness.id, harness);
	return () => {
		if (harnesses.get(harness.id) === harness) harnesses.delete(harness.id);
	};
}

export function getRegisteredHarnesses(): AgentHarness[] {
	return Array.from(getRegistryState().harnesses.values());
}

export function clearRegisteredAgentHarnesses(): void {
	getRegistryState().harnesses.clear();
}

export async function resetRegisteredAgentHarnesses(input: { reason: string }): Promise<void> {
	await Promise.all(
		getRegisteredHarnesses().map(async (harness) => {
			try {
				await harness.reset?.(input);
			} catch {
				return undefined;
			}
		})
	);
}
