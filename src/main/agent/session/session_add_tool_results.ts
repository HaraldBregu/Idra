import type { ToolCall } from '../types';
import { persist } from './session_persist';
import type { SessionState } from './session_types';

export function addToolResults(state: SessionState, calls: ToolCall[]): void {
	state.toolCalls.push(...calls);
	persist(state);
}
