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

	it('applies allowlist security before agent dispatch', () => {
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

	it('denies direct messages by default when the allowlist is empty', () => {
		const account = telegramChannelPlugin.config.getDefaultAccount({
			token: 'token',
			allowFrom: [],
		});
		const message = normalizeTelegramTextMessage({
			accountId: 'default',
			from: 'sender',
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

	it('supports named accounts while preserving legacy default config', () => {
		const config = {
			token: 'legacy-token',
			allowFrom: ['legacy-user'],
			defaultAccountId: 'work',
			accounts: {
				work: {
					token: 'work-token',
					label: 'Work bot',
					allowFrom: ['work-user'],
					defaultTarget: '-100',
				},
			},
		};

		expect(telegramChannelPlugin.config.listAccountIds(config)).toEqual(['work']);
		expect(telegramChannelPlugin.config.getDefaultAccount(config)).toMatchObject({
			id: 'work',
			label: 'Work bot',
			configured: true,
			allowFrom: ['work-user'],
			defaultTargetId: '-100',
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

	it('parses provider-prefixed targets and maps thread-aware session routes', () => {
		const parsed = telegramChannelPlugin.messaging?.parseExplicitTarget(
			'telegram:work/-100#topic-1'
		);

		expect(parsed).toMatchObject({
			channelId: 'telegram',
			accountId: 'work',
			targetId: '-100',
			threadId: 'topic-1',
			chatType: 'thread',
		});
		expect(parsed && telegramChannelPlugin.messaging?.resolveSessionTarget(parsed)).toBe(
			'telegram:work:-100:topic-1'
		);
		expect(parsed && telegramChannelPlugin.messaging?.resolveSessionConversation(parsed)).toMatchObject({
			parentConversationCandidates: ['telegram:work:-100:topic-1', 'telegram:work:-100'],
			deliveryTarget: '-100',
		});
	});

	it('shapes message send payloads under channelData without bypassing durable send', () => {
		const payload = telegramChannelPlugin.actions?.prepareSendPayload?.({
			type: 'telegram',
			to: '-100',
			text: 'hello',
			threadId: 'topic-1',
			replyToMessageId: 'm1',
		});

		expect(payload).toEqual({
			message: {
				type: 'telegram',
				to: '-100',
				text: 'hello',
				threadId: 'topic-1',
				replyToMessageId: 'm1',
			},
			channelData: {
				telegram: {
					chatId: '-100',
					threadId: 'topic-1',
					replyToMessageId: 'm1',
				},
			},
		});
	});
});
