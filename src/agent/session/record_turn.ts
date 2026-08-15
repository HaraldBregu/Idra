import type { SessionTurn } from './types';
import type { SessionState } from './types';

export function recordTurn(state: SessionState, turn: SessionTurn): void {
	state.numTurns += 1;
	state.model = turn.model;
	state.stopReason = turn.stopReason;
	state.usage.inputTokens += turn.usage?.inputTokens ?? 0;
	state.usage.outputTokens += turn.usage?.outputTokens ?? 0;
	if (turn.content) state.finalText = turn.content;
}
