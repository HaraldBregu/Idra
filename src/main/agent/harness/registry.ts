import type { AgentHarness, AgentHarnessResetParams, RegisteredAgentHarness } from './types';
import { agentLogger } from '../logger';

const AGENT_HARNESS_REGISTRY_STATE = Symbol.for('friday.agentHarnessRegistryState');

interface AgentHarnessRegistryState {
	harnesses: Map<string, RegisteredAgentHarness>;
}

function getAgentHarnessRegistryState(): AgentHarnessRegistryState {
	const globalState = globalThis as typeof globalThis & {
		[AGENT_HARNESS_REGISTRY_STATE]?: AgentHarnessRegistryState;
	};
	globalState[AGENT_HARNESS_REGISTRY_STATE] ??= {
		harnesses: new Map<string, RegisteredAgentHarness>(),
	};
	return globalState[AGENT_HARNESS_REGISTRY_STATE];
}

function normalizeAgentHarnessId(input: unknown): string {
	return typeof input === 'string' ? input.trim() : '';
}

export function registerAgentHarness(
	harness: AgentHarness,
	options?: { ownerPluginId?: string }
): void {
	const id = normalizeAgentHarnessId(harness?.id);
	if (!id) {
		throw new Error('Agent harness registration missing id.');
	}
	if (typeof harness.supports !== 'function' || typeof harness.runAttempt !== 'function') {
		throw new Error(`Agent harness "${id}" registration missing required runtime methods.`);
	}
	const state = getAgentHarnessRegistryState();
	if (state.harnesses.has(id)) {
		throw new Error(`Agent harness already registered: ${id}`);
	}
	state.harnesses.set(id, {
		harness: {
			...harness,
			id,
			pluginId: harness.pluginId ?? options?.ownerPluginId,
		},
		ownerPluginId: options?.ownerPluginId,
	});
}

export function getAgentHarness(id: string): AgentHarness | undefined {
	return getRegisteredAgentHarness(id)?.harness;
}

export function getRegisteredAgentHarness(id: string): RegisteredAgentHarness | undefined {
	return getAgentHarnessRegistryState().harnesses.get(normalizeAgentHarnessId(id));
}

export function listAgentHarnessIds(): string[] {
	return [...getAgentHarnessRegistryState().harnesses.keys()];
}

export function listRegisteredAgentHarnesses(): RegisteredAgentHarness[] {
	return Array.from(getAgentHarnessRegistryState().harnesses.values());
}

export function clearRegisteredAgentHarnesses(): void {
	getAgentHarnessRegistryState().harnesses.clear();
}

export async function resetRegisteredAgentHarnesses(params: AgentHarnessResetParams): Promise<void> {
	await Promise.all(
		listRegisteredAgentHarnesses().map(async (entry) => {
			if (!entry.harness.reset) return;
			try {
				await entry.harness.reset(params);
			} catch (error) {
				agentLogger.warn('agents/harness/registry', 'agent harness reset failed', {
					harnessId: entry.harness.id,
					pluginId: entry.ownerPluginId ?? entry.harness.pluginId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		})
	);
}

export async function disposeRegisteredAgentHarnesses(): Promise<void> {
	await Promise.all(
		listRegisteredAgentHarnesses().map(async (entry) => {
			if (!entry.harness.dispose) return;
			try {
				await entry.harness.dispose();
			} catch (error) {
				agentLogger.warn('agents/harness/registry', 'agent harness dispose failed', {
					harnessId: entry.harness.id,
					pluginId: entry.ownerPluginId ?? entry.harness.pluginId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		})
	);
}
