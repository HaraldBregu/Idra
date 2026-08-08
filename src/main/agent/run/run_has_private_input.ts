import type { Message } from '../types';

export function hasPrivateInput(messages: readonly Message[]): boolean {
	return messages.some(
		(message) =>
			Array.isArray(message.content) &&
			message.content.some((block) => block.type === 'image' || block.type === 'file')
	);
}
