import type { AgentCommand, AgentContextState, CommandOutcome } from './context_state_types';

// ponytail: flat cap keeps a long-lived main process from growing forever; page to disk if history must outlive it
const HISTORY_LIMIT = 200;

export function finishCommand(
	state: AgentContextState,
	command: AgentCommand,
	outcome: CommandOutcome,
	startedAt: number
): void {
	state.history.push({ ...outcome, command, startedAt, endedAt: Date.now() });
	if (state.history.length > HISTORY_LIMIT) state.history.shift();
	if (outcome.error) state.errors.push(outcome.error);
	if (state.current === command) state.current = undefined;
	state.loopState =
		outcome.status === 'error' ? 'error' : outcome.status === 'cancelled' ? 'cancelled' : 'idle';
	state.execution = { phase: 'idle' };
}
