import { runChannelTurn } from '../../../../src/main/channels/turn';
import type { ChannelAccountSnapshot, ChannelInboundMessage, ChannelPlugin } from '../../../../src/main/channels';

const account: ChannelAccountSnapshot = {
	id: 'default',
	label: 'Default',
	enabled: true,
	configured: true,
	allowFrom: ['sender'],
	dmPolicy: 'allowlist',
};

const rawMessage: ChannelInboundMessage = {
	type: 'telegram',
	accountId: 'default',
	from: 'sender',
	chatId: 'chat',
	text: 'hello',
	messageId: 'm1',
};

const plugin = {
	id: 'telegram',
	meta: { name: 'Telegram', description: 'Test' },
	capabilities: {
		inbound: true,
		outbound: true,
		text: true,
		media: false,
		voice: false,
		polls: false,
		receipts: true,
		threading: true,
		groups: true,
		setup: true,
		longRunningGateway: true,
	},
	config: {} as ChannelPlugin['config'],
	messaging: {
		normalizeInbound: (message: ChannelInboundMessage) => ({
			channelId: message.type,
			accountId: message.accountId ?? 'default',
			senderId: message.from,
			targetId: message.chatId,
			chatType: 'dm' as const,
			messageId: message.messageId ?? 'm1',
			text: message.text,
			media: [],
			provenance: {},
			idempotencyKey: 'telegram:default:chat:m1',
			receivedAt: 1,
		}),
	},
	security: {
		canReceive: () => ({ allowed: true }),
	},
} as ChannelPlugin;

describe('runChannelTurn', () => {
	it('records before dispatch and finalizes receive flows', async () => {
		const events: string[] = [];

		await runChannelTurn({
			message: rawMessage,
			accountId: 'default',
			config: {},
			plugin,
			resolveAccount: () => account,
			record: () => events.push('record'),
			dispatch: () => events.push('dispatch'),
			finalize: () => events.push('finalize'),
		});

		expect(events).toEqual(['record', 'dispatch', 'finalize']);
	});

	it('runs finalize cleanup on dispatch errors', async () => {
		const finalize = jest.fn();

		await expect(
			runChannelTurn({
				message: rawMessage,
				accountId: 'default',
				config: {},
				plugin,
				resolveAccount: () => account,
				dispatch: () => {
					throw new Error('dispatch failed');
				},
				finalize,
			})
		).rejects.toThrow('dispatch failed');

		expect(finalize).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: 'dispatch' }),
			expect.any(Error)
		);
	});
});
