import type { Bot } from 'grammy';
import { registerTextHandler } from '../../../../../src/main/channels/telegram/receive';

type TextHandler = (ctx: {
	message: { text: string };
	from?: { id: number | string; first_name?: string; last_name?: string; username?: string };
	chat: { id: number | string };
}) => Promise<void>;

function createBotStub(): { bot: Bot; getHandler: () => TextHandler } {
	let handler: TextHandler | null = null;
	const bot = {
		on: jest.fn((_event: string, next: TextHandler) => {
			handler = next;
		}),
	} as unknown as Bot;

	return {
		bot,
		getHandler: () => {
			if (!handler) throw new Error('handler not registered');
			return handler;
		},
	};
}

describe('telegram registerTextHandler', () => {
	it('emits plain text messages with sender and chat identifiers', async () => {
		const { bot, getHandler } = createBotStub();
		const emit = jest.fn();

		registerTextHandler(bot, emit);

		await getHandler()({
			message: { text: 'hello' },
			from: { id: 123, first_name: 'Ada', last_name: 'Lovelace' },
			chat: { id: 456 },
		});

		expect(emit).toHaveBeenCalledWith(
			expect.objectContaining({
				from: '123',
				fromName: 'Ada Lovelace',
				chatId: '456',
				text: 'hello',
				chatType: 'dm',
			})
		);
	});

	it('ignores slash commands', async () => {
		const { bot, getHandler } = createBotStub();
		const emit = jest.fn();

		registerTextHandler(bot, emit);

		await getHandler()({
			message: { text: '/start' },
			from: { id: 123 },
			chat: { id: 456 },
		});

		expect(emit).not.toHaveBeenCalled();
	});

	it('emits senders for core policy resolution without logging raw ids', async () => {
		const { bot, getHandler } = createBotStub();
		const emit = jest.fn();
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

		registerTextHandler(bot, emit);

		await getHandler()({
			message: { text: 'hello' },
			from: { id: 'blocked-user' },
			chat: { id: 456 },
		});

		expect(emit).toHaveBeenCalledWith(expect.objectContaining({ from: 'blocked-user' }));
		expect(warn).not.toHaveBeenCalled();
	});
});
