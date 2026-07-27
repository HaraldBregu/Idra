import {
	MODEL_CONTEXT_CHARACTER_LIMIT,
	MODEL_MESSAGE_LIMIT,
	modelMessages,
} from '../../../../../src/main/agent/session/session_model_messages';
import type { Message } from '../../../../../src/main/agent/types';

describe('modelMessages', () => {
	it('keeps the latest complete run and drops oversized older turns', () => {
		const messages: Message[] = [
			{ role: 'user', content: 'x'.repeat(MODEL_CONTEXT_CHARACTER_LIMIT) },
			{ role: 'assistant', content: 'old answer' },
			{ role: 'user', content: 'current request' },
			{
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						id: 'tool-1',
						name: 'read',
						args: { path: 'file.txt' },
						result: { content: 'current result' },
					},
				],
			},
		];

		expect(modelMessages(messages)).toEqual(messages.slice(2));
	});

	it('keeps at most the latest fifty messages on complete user boundaries', () => {
		const messages: Message[] = [];
		for (let index = 0; index < 30; index += 1) {
			messages.push({ role: 'user', content: `user ${index}` });
			messages.push({ role: 'assistant', content: `assistant ${index}` });
		}

		const selected = modelMessages(messages);

		expect(selected).toHaveLength(MODEL_MESSAGE_LIMIT);
		expect(selected[0]).toEqual({ role: 'user', content: 'user 5' });
		expect(selected.at(-1)).toEqual({ role: 'assistant', content: 'assistant 29' });
	});
});
