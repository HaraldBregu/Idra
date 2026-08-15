import type { SessionState } from './types';

export function isExhausted(state: SessionState): boolean {
	return state.numTurns >= state.maxTurns;
}
