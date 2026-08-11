import { persist } from './session_persist';
import type { SessionState } from './session_types';

export function insertUserMessage(state: SessionState, index: number, content: string): void {
	state.messages.splice(index, 0, { role: 'user', content });
	persist(state);
}
