import { persist } from './session_persist';
import type { SessionState } from './session_types';

export function updateUserMessage(state: SessionState, index: number, content: string): void {
	const message = state.messages[index];
	if (!message || message.role !== 'user' || message.content !== 'Voice message') return;
	state.messages[index] = { ...message, content };
	persist(state);
}
