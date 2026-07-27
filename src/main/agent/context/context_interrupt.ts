import {
	AGENT_CONTEXT_HISTORY_LIMIT,
	type AgentCommand,
	type AgentContextState,
} from './context_state_types';

export function interruptCommands(state: AgentContextState, agentId?: string): void {
	const matches = (command: AgentCommand): boolean => !agentId || command.agentId === agentId;
	const dropped = state.pending.filter(matches);
	state.pending = state.pending.filter((command) => !matches(command));
	const now = Date.now();
	for (const command of dropped)
		state.history.push({ command, status: 'cancelled', startedAt: now, endedAt: now });
	if (state.history.length > AGENT_CONTEXT_HISTORY_LIMIT)
		state.history.splice(0, state.history.length - AGENT_CONTEXT_HISTORY_LIMIT);
	if (dropped.length > 0 || (state.current && matches(state.current))) state.interruptions += 1;
}
