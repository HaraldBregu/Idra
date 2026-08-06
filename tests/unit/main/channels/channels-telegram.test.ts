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
	it('logs received voice messages', () => {
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		createTelegramAdapter({ token: 'token' });

		expect(mockOn).toHaveBeenCalledWith('message:voice', expect.any(Function));
		const handler = mockOn.mock.calls.find(([filter]) => filter === 'message:voice')?.[1] as () => void;
		handler();

		expect(log).toHaveBeenCalledWith('[telegram] voice message received');
	});
});
