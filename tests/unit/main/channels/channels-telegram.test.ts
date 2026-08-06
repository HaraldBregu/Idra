const mockOn = jest.fn();

jest.mock('grammy', () => ({
	Bot: jest.fn().mockImplementation(() => ({
		on: mockOn,
		catch: jest.fn(),
	})),
	GrammyError: class extends Error {},
	HttpError: class extends Error {},
}));

import { createTelegramAdapter } from '../../../../src/main/channels/adapters/telegram';

describe('Telegram voice messages', () => {
	it('registers received voice messages', () => {
		createTelegramAdapter({ token: 'token' });

		expect(mockOn).toHaveBeenCalledWith('message:voice', expect.any(Function));
	});
});
