import type { RuntimeInput, RuntimeMessage } from '../types';

/**
 * Builds the transcript sent into the first model turn.
 *
 * Existing history is preserved first, then the current user message is appended
 * when present. The returned array is mutable because the runtime appends
 * assistant and tool result messages on later turns.
 */
export function composeMessages(input: RuntimeInput): RuntimeMessage[] {
	const messages = [...(input.messages ?? [])];
	if (input.message) messages.push({ role: 'user', content: input.message });
	return messages;
}
