const RUNTIME_KEYS = new Set(['agentRuntime', 'agentHarnessId', 'agentHarnessRuntime']);

export type AgentHarnessRuntimeEnv = {
	FRIDAY_AGENT_RUNTIME?: string;
	[key: string]: string | undefined;
};

export function collectConfiguredAgentHarnessRuntimes(
	config: unknown,
	env: AgentHarnessRuntimeEnv = process.env
): string[] {
	const runtimes = new Set<string>();
	addRuntime(runtimes, env.FRIDAY_AGENT_RUNTIME);
	visitConfig(config, runtimes);
	return [...runtimes].sort();
}

function visitConfig(value: unknown, runtimes: Set<string>): void {
	if (Array.isArray(value)) {
		for (const item of value) visitConfig(item, runtimes);
		return;
	}
	if (!value || typeof value !== 'object') return;

	for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
		if (RUNTIME_KEYS.has(key)) {
			addRuntime(runtimes, nested);
			continue;
		}
		if (key === 'options' || key === 'agents' || key === 'models' || key === 'providers' || key === 'llmAgent') {
			visitConfig(nested, runtimes);
		}
	}
}

function addRuntime(runtimes: Set<string>, value: unknown): void {
	if (typeof value !== 'string') return;
	const runtime = value.trim().toLowerCase();
	if (!runtime || runtime === 'auto' || runtime === 'pi') return;
	runtimes.add(runtime);
}
