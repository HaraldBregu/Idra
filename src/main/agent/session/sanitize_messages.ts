import type { Message } from '../types';
import { hasAssistantPayload } from './has_assistant_payload';

export function sanitizeMessages(messages: Message[]): Message[] {
	const sanitized: Message[] = [];
	for (const message of messages) {
		if (
			message.role === 'assistant' &&
			!hasAssistantPayload(message.content, message.toolCalls)
		)
			continue;
		sanitized.push(message);
	}
	return sanitized;
}
