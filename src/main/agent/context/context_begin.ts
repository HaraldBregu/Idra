import type { AgentCommand, AgentContextState } from './context_state_types';

export function beginCommand(state: AgentContextState, command: AgentCommand): void {
	const index = state.pending.indexOf(command);
	if (index >= 0) state.pending.splice(index, 1);
	state.current = command;
	state.loopState = 'running';
	state.task = { description: command.message, turns: 0, toolCalls: 0 };
	state.execution = { phase: 'thinking' };
}
