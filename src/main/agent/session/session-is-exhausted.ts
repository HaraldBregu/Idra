import type { SessionState } from './session-types';

export function isExhausted(state: SessionState): boolean {
	return state.numTurns >= state.maxTurns;
}
