import type { RuntimeInput, RuntimeMessage } from './types';

export function composeMessages(input: RuntimeInput): RuntimeMessage[] {
	const messages = [...(input.messages ?? [])];
	if (input.message) messages.push({ role: 'user', content: input.message });
	return messages;
}
