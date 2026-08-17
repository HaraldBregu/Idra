import type { ToolCall } from '../types';
import { persist } from './persist';
import type { SessionState } from './types';

export function addToolResults(state: SessionState, calls: ToolCall[], persistState = true): void {
	state.toolCalls.push(...calls);
	if (persistState) persist(state);
}
