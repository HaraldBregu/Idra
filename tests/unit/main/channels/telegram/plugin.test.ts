import { telegramChannelPlugin } from '../../../../../src/main/channels/telegram/plugin';
import { normalizeTelegramTextMessage } from '../../../../../src/main/channels/telegram/receive';

describe('telegramChannelPlugin', () => {
	it('resolves the default account from channel config', () => {
		const account = telegramChannelPlugin.config.getDefaultAccount({
			token: ' token ',
			allowFrom: ['123', '123', ' 456 '],
		});

		expect(account).toMatchObject({
			id: 'default',
			label: 'Telegram bot',
			enabled: true,
			configured: true,
			allowFrom: ['123', '456'],
		});
	});

	it('validates setup input and normalizes stored config', () => {
		expect(telegramChannelPlugin.setup?.validate({ token: ' ', allowFrom: [] })).toContain(
			'Telegram bot token is required.'
		);

		expect(
			telegramChannelPlugin.setup?.apply(
				{ token: '', allowFrom: [] },
				{ token: ' token ', allowFrom: [' 1 ', '', '1'] }
			).config
		).toEqual({ token: 'token', allowFrom: ['1'] });
	});

	it('applies allowlist security before assistant dispatch', () => {
		const account = telegramChannelPlugin.config.getDefaultAccount({
			token: 'token',
			allowFrom: ['allowed'],
		});
		const message = normalizeTelegramTextMessage({
			accountId: 'default',
			from: 'blocked',
			chatId: 'chat',
			text: 'hello',
			messageId: 'm1',
		});

		expect(account).not.toBeNull();
		expect(telegramChannelPlugin.security?.canReceive(message, account!)).toEqual({
			allowed: false,
			reason: 'sender_not_allowed',
		});
	});

	it('maps platform conversations to stable session keys', () => {
		const message = normalizeTelegramTextMessage({
			accountId: 'default',
			from: '123',
			chatId: 'chat',
			text: 'hello',
			messageId: 'm1',
			threadId: 'topic-1',
		});

		expect(telegramChannelPlugin.threading?.getSessionKey(message)).toBe(
			'telegram:default:chat:topic-1'
		);
	});
});
