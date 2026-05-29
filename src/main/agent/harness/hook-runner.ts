export type AgentHarnessLifecycleHookName =
	| 'before_agent_start'
	| 'before_prompt_build'
	| 'before_message_write'
	| 'before_compaction'
	| 'after_compaction'
	| 'llm_input'
	| 'llm_output'
	| 'after_tool_call'
	| 'agent_end';

export type AgentHarnessLifecycleHookHandler = (payload: Record<string, unknown>) => void | Promise<void>;

const HOOK_RUNNER_STATE = Symbol.for('friday.agentHarnessHookRunnerState');

interface HookRunnerState {
	handlers: Map<AgentHarnessLifecycleHookName, Set<AgentHarnessLifecycleHookHandler>>;
}

function getState(): HookRunnerState {
	const g = globalThis as typeof globalThis & { [HOOK_RUNNER_STATE]?: HookRunnerState };
	g[HOOK_RUNNER_STATE] ??= { handlers: new Map() };
	return g[HOOK_RUNNER_STATE];
}

export function registerAgentHarnessHookHandler(
	name: AgentHarnessLifecycleHookName,
	handler: AgentHarnessLifecycleHookHandler
): () => void {
	const state = getState();
	const handlers = state.handlers.get(name) ?? new Set();
	handlers.add(handler);
	state.handlers.set(name, handlers);
	return () => {
		handlers.delete(handler);
		if (handlers.size === 0) state.handlers.delete(name);
	};
}

export function clearAgentHarnessHookProviders(): void {
	getState().handlers.clear();
}

export async function emitAgentHarnessLifecycleHook(
	name: AgentHarnessLifecycleHookName,
	payload: Record<string, unknown>
): Promise<void> {
	for (const handler of getState().handlers.get(name) ?? []) {
		try {
			await handler(payload);
		} catch {
			// fire-and-forget — individual handler failures do not propagate
		}
	}
}
