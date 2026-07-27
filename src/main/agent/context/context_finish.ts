import {
	AGENT_CONTEXT_HISTORY_LIMIT,
	type AgentCommand,
	type AgentContextState,
	type CommandOutcome,
} from './context_state_types';

export function finishCommand(
	state: AgentContextState,
	command: AgentCommand,
	outcome: CommandOutcome,
	startedAt: number
): void {
	state.history.push({ ...outcome, command, startedAt, endedAt: Date.now() });
	if (state.history.length > AGENT_CONTEXT_HISTORY_LIMIT)
		state.history.splice(0, state.history.length - AGENT_CONTEXT_HISTORY_LIMIT);
	if (outcome.error) {
		state.errors.push(outcome.error);
		if (state.errors.length > AGENT_CONTEXT_HISTORY_LIMIT)
			state.errors.splice(0, state.errors.length - AGENT_CONTEXT_HISTORY_LIMIT);
	}
	if (state.current === command) state.current = undefined;
	state.loopState =
		outcome.status === 'error' ? 'error' : outcome.status === 'cancelled' ? 'cancelled' : 'idle';
	state.execution = { phase: 'idle' };
}
