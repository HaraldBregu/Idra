import type { AgentCommand, AgentContextState } from './context_state_types';

export function beginCommand(state: AgentContextState, command: AgentCommand): void {
	const index = state.pending.indexOf(command);
	if (index >= 0) state.pending.splice(index, 1);
	state.current = command;
}
