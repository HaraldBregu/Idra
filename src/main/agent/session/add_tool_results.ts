import type { ToolCall } from '../types';
import { persist } from './persist';
import type { SessionState } from './types';

export function addToolResults(state: SessionState, calls: ToolCall[]): void {
	state.toolCalls.push(...calls);
	persist(state);
}
