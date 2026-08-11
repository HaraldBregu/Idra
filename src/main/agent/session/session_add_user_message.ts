import { persist } from './session_persist';
import type { SessionState } from './session_types';

export function addUserMessage(state: SessionState, content: string): void {
	state.messages.push({ role: 'user', content });
	persist(state);
}
