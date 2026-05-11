import type { Bot } from 'grammy';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../../../../../src/main/channels/telegram/constants';
import { sendChunked } from '../../../../../src/main/channels/telegram/send';

describe('telegram sendChunked', () => {
	it('sends one message when text fits Telegram limits', async () => {
		const sendMessage = jest.fn().mockResolvedValue(undefined);
		const bot = { api: { sendMessage } } as unknown as Bot;

		await sendChunked(bot, 'chat-1', 'hello');

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith('chat-1', 'hello');
	});

	it('splits long messages into Telegram-sized chunks in order', async () => {
		const sendMessage = jest.fn().mockResolvedValue(undefined);
		const bot = { api: { sendMessage } } as unknown as Bot;
		const first = 'a'.repeat(TELEGRAM_MAX_MESSAGE_LENGTH);
		const second = 'b'.repeat(12);

		await sendChunked(bot, 'chat-1', `${first}${second}`);

		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(sendMessage).toHaveBeenNthCalledWith(1, 'chat-1', first);
		expect(sendMessage).toHaveBeenNthCalledWith(2, 'chat-1', second);
	});
});
