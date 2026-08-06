const mockOn = jest.fn();
const mockSendVoice = jest.fn();

class MockInputFile {
	constructor(
		readonly data: Buffer,
		readonly fileName: string
	) {}
}

jest.mock('grammy', () => ({
	Bot: jest.fn().mockImplementation(() => ({
		on: mockOn,
		catch: jest.fn(),
		api: { sendVoice: mockSendVoice },
	})),
	GrammyError: class extends Error {},
	HttpError: class extends Error {},
	InputFile: MockInputFile,
}));

import { createTelegramAdapter } from '../../../../src/main/channels/adapters/telegram';

describe('Telegram voice messages', () => {
	it('registers received voice messages', () => {
		createTelegramAdapter({ token: 'token' });

		expect(mockOn).toHaveBeenCalledWith('message:voice', expect.any(Function));
	});

	it('sends a native voice message', async () => {
		mockSendVoice.mockResolvedValueOnce({ message_id: 42 });
		const adapter = createTelegramAdapter({ token: 'token' });
		const receipt = await adapter.send({
			channel: 'telegram',
			to: 'chat-1',
			content: {
				type: 'voice',
				voice: { data: 'YWJj', mimeType: 'audio/mpeg', fileName: 'reply.mp3' },
				fallbackText: 'hello',
			},
		});

		expect(mockSendVoice).toHaveBeenCalledWith(
			'chat-1',
			expect.objectContaining({ fileName: 'reply.mp3' }),
			expect.any(Object)
		);
		expect(receipt.platformMessageIds).toEqual(['42']);
	});
});
