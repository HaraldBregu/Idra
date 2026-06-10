import type { SessionInput, SessionMessage } from '../types';

export function composeMessages(input: SessionInput): SessionMessage[] {
	const messages = [...(input.messages ?? [])];
	if (input.message) messages.push({ role: 'user', content: input.message });
	return messages;
}
