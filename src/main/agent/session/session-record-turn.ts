import type { SessionTurn } from './session-types';
import type { SessionState } from './session-types';

export function recordTurn(state: SessionState, turn: SessionTurn): void {
	state.model = turn.model;
	state.stopReason = turn.stopReason;
	state.usage.inputTokens += turn.usage?.inputTokens ?? 0;
	state.usage.outputTokens += turn.usage?.outputTokens ?? 0;
	if (turn.content) state.finalText = turn.content;
}
