import { persist } from './persist';
import type { SessionState } from './types';

export function insertUserMessage(state: SessionState, index: number, content: string): void {
	state.messages.splice(index, 0, { role: 'user', content });
	persist(state);
}
