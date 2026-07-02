import type { SessionState } from './session_types';

export function isExhausted(state: SessionState): boolean {
	return state.numTurns >= state.maxTurns;
}
