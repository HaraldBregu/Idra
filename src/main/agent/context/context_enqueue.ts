import type { AgentCommand, AgentContextState } from './context_state_types';

export function enqueueCommand(state: AgentContextState, command: AgentCommand): void {
	state.pending.push(command);
}
