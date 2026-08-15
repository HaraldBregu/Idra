import { persist } from './persist';
import type { SessionState } from './types';

export function addUserMessage(state: SessionState, content: string): void {
	state.messages.push({ role: 'user', content });
	persist(state);
}
