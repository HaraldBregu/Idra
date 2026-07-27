import type { Message } from '../types';

export const MODEL_MESSAGE_LIMIT = 50;
export const MODEL_CONTEXT_CHARACTER_LIMIT = 120_000;

export function modelMessages(messages: Message[]): Message[] {
	if (messages.length === 0) return [];

	let latestUserIndex = -1;
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index].role !== 'user') continue;
		latestUserIndex = index;
		break;
	}

	if (latestUserIndex < 0) return messages.slice(-1);

	let start = latestUserIndex;
	let count = messages.length - start;
	if (count > MODEL_MESSAGE_LIMIT) {
		return [messages[start], ...messages.slice(-(MODEL_MESSAGE_LIMIT - 1))];
	}

	let characters = 0;
	for (let index = start; index < messages.length; index += 1)
		characters += JSON.stringify(messages[index]).length;

	while (start > 0) {
		let previousUserIndex = -1;
		for (let index = start - 1; index >= 0; index -= 1) {
			if (messages[index].role !== 'user') continue;
			previousUserIndex = index;
			break;
		}
		if (previousUserIndex < 0) break;

		const groupCount = start - previousUserIndex;
		if (count + groupCount > MODEL_MESSAGE_LIMIT) break;

		let groupCharacters = 0;
		for (let index = previousUserIndex; index < start; index += 1)
			groupCharacters += JSON.stringify(messages[index]).length;
		if (characters + groupCharacters > MODEL_CONTEXT_CHARACTER_LIMIT) break;

		start = previousUserIndex;
		count += groupCount;
		characters += groupCharacters;
	}

	return messages.slice(start);
}
