const HOOK_RUNNER_STATE = Symbol.for('friday.agentHarnessHookRunnerState');

export type AgentHarnessHookHandler = (payload: unknown) => Promise<unknown> | unknown;

export type AgentHarnessHookProvider = {
	listHandlers(hookName: string): AgentHarnessHookHandler[];
};

interface HookRunnerState {
	providers: AgentHarnessHookProvider[];
	handlers: Map<string, AgentHarnessHookHandler[]>;
}

function getState(): HookRunnerState {
	const g = globalThis as typeof globalThis & { [HOOK_RUNNER_STATE]?: HookRunnerState };
	g[HOOK_RUNNER_STATE] ??= { providers: [], handlers: new Map() };
	return g[HOOK_RUNNER_STATE];
}

export function registerAgentHarnessHookProvider(provider: AgentHarnessHookProvider): void {
	getState().providers.push(provider);
}

export function registerAgentHarnessHookHandler(
	hookName: string,
	handler: AgentHarnessHookHandler
): void {
	const name = hookName.trim();
	if (!name) throw new Error('Agent harness hook registration missing hook name.');
	const state = getState();
	const handlers = state.handlers.get(name) ?? [];
	handlers.push(handler);
	state.handlers.set(name, handlers);
}

export function clearAgentHarnessHookProviders(): void {
	const state = getState();
	state.providers = [];
	state.handlers.clear();
}

export async function dispatchAgentHarnessHook(hookName: string, payload: unknown): Promise<void> {
	const { providers, handlers: registeredHandlers } = getState();
	const handlers = registeredHandlers.get(hookName) ?? [];
	for (const handler of handlers) {
		try {
			await handler(payload);
		} catch (error) {
			void error;
		}
	}
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
