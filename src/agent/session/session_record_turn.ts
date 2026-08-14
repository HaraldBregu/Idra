import type { SessionTurn } from './session_types';
import type { SessionState } from './session_types';

export function recordTurn(state: SessionState, turn: SessionTurn): void {
	state.numTurns += 1;
	state.model = turn.model;
	state.stopReason = turn.stopReason;
	state.usage.inputTokens += turn.usage?.inputTokens ?? 0;
	state.usage.outputTokens += turn.usage?.outputTokens ?? 0;
	if (turn.content) state.finalText = turn.content;
}
