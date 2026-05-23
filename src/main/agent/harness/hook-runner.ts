const HOOK_RUNNER_STATE = Symbol.for('friday.agentHarnessHookRunnerState');

export type AgentHarnessHookHandler = (payload: unknown) => Promise<unknown> | unknown;

export type AgentHarnessHookProvider = {
	listHandlers(hookName: string): AgentHarnessHookHandler[];
};

interface HookRunnerState {
	providers: AgentHarnessHookProvider[];
}

function getState(): HookRunnerState {
	const g = globalThis as typeof globalThis & { [HOOK_RUNNER_STATE]?: HookRunnerState };
	g[HOOK_RUNNER_STATE] ??= { providers: [] };
	return g[HOOK_RUNNER_STATE];
}

export function registerAgentHarnessHookProvider(provider: AgentHarnessHookProvider): void {
	getState().providers.push(provider);
}

export function clearAgentHarnessHookProviders(): void {
	getState().providers = [];
}

export async function dispatchAgentHarnessHook(hookName: string, payload: unknown): Promise<void> {
	const { providers } = getState();
	for (const provider of providers) {
		const handlers = provider.listHandlers(hookName);
		for (const handler of handlers) {
			try {
				await handler(payload);
			} catch {
				// fire-and-forget — individual handler failures do not propagate
			}
		}
	}
}
