import type { ToolCall } from '../types';
import { persist } from './session-persist';
import type { SessionState } from './session-types';

export function addToolResults(state: SessionState, calls: ToolCall[]): void {
	state.toolCalls.push(...calls);
	state.numTurns += 1;
	persist(state);
}
