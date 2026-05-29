import { agentLogger } from '../logger';

type RuntimeActivationHook = {
	activate(params: AgentHarnessRuntimeActivationParams): Promise<void> | void;
};

type RuntimeActivationState = {
	activator?: RuntimeActivationHook;
	activatedRuntimes: Set<string>;
};

export interface AgentHarnessRuntimeActivationParams {
	runtime: string;
	provider: string;
	modelId?: string;
}

const AGENT_HARNESS_RUNTIME_ACTIVATION_STATE = Symbol.for(
	'friday.agentHarnessRuntimeActivationState'
);

function getRuntimeActivationState(): RuntimeActivationState {
	const globalState = globalThis as typeof globalThis & {
		[AGENT_HARNESS_RUNTIME_ACTIVATION_STATE]?: RuntimeActivationState;
	};
	globalState[AGENT_HARNESS_RUNTIME_ACTIVATION_STATE] ??= {
		activatedRuntimes: new Set<string>(),
	};
	return globalState[AGENT_HARNESS_RUNTIME_ACTIVATION_STATE]!;
}

export function registerAgentHarnessRuntimeActivator(activator: RuntimeActivationHook): void {
	const state = getRuntimeActivationState();
	state.activator = activator;
}

export async function ensureAgentHarnessRuntimeActivated(
	params: AgentHarnessRuntimeActivationParams
): Promise<void> {
	const runtime = params.runtime.trim().toLowerCase();
	if (!runtime || runtime === 'pi' || runtime === 'auto') {
		return;
	}

	const state = getRuntimeActivationState();
	if (state.activatedRuntimes.has(runtime)) {
		return;
	}

	const activator = state.activator;
	if (!activator?.activate) {
		agentLogger.debug('agents/harness/activation', 'agent harness activation hook is unavailable; runtime activation skipped', {
			runtime,
			provider: params.provider,
			modelId: params.modelId,
		});
		state.activatedRuntimes.add(runtime);
		return;
	}

	try {
		state.activatedRuntimes.add(runtime);
		await activator.activate({ runtime, provider: params.provider, modelId: params.modelId });
		agentLogger.debug('agents/harness/activation', 'agent harness runtime activation requested', {
			runtime,
			provider: params.provider,
			modelId: params.modelId,
		});
	} catch (error) {
		state.activatedRuntimes.delete(runtime);
		agentLogger.warn('agents/harness/activation', 'agent harness runtime activation failed', {
			runtime,
			provider: params.provider,
			modelId: params.modelId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
