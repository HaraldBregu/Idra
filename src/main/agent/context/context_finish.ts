import type { AgentCommand, AgentContextState } from './context_state_types';

export function finishCommand(state: AgentContextState, command: AgentCommand): void {
	if (state.current === command) state.current = undefined;
}
