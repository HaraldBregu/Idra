import type { AgentContextState } from './context_state_types';

export function interruptCommands(state: AgentContextState, agentId?: string): void {
	state.pending = agentId ? state.pending.filter((command) => command.agentId !== agentId) : [];
}
