export type AgentHarnessPolicy = {
	runtime: string;
	runtimeSource?: 'request' | 'store' | 'default';
};

function normalizeRuntime(input: unknown): string {
	return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

export function resolveAgentHarnessPolicy(params: {
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
