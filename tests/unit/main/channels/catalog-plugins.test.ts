import { createBundledCatalogPlugins } from '../../../../src/main/channels/catalog-plugins';
import { listChannelCatalog } from '../../../../src/main/channels/catalog';
import type { ChannelType } from '../../../../src/shared/channels';

describe('catalog channel plugins', () => {
	it('creates a plugin adapter for every documented catalog entry', () => {
		const plugins = createBundledCatalogPlugins();

		expect(plugins.map((plugin) => plugin.id)).toEqual(
			listChannelCatalog().map((entry) => entry.id)
		);
		expect(new Set(plugins.map((plugin) => plugin.config)).size).toBe(plugins.length);

		for (const plugin of plugins) {
			const entry = listChannelCatalog().find((item) => item.id === plugin.id);
			expect(entry).toBeDefined();
			expect(plugin.messaging?.targetPrefixes).toEqual([plugin.id, ...(entry?.aliases ?? [])]);
			expect(plugin.capabilities).toMatchObject({
				inbound: false,
				outbound: false,
				longRunningGateway: false,
				durableDelivery: [],
			});
			expect(plugin.doctor?.inspect({}).at(0)).toMatchObject({
				severity: 'info',
				message: expect.stringContaining('does not have a bundled runtime yet'),
			});
		}
	});

	it('uses per-channel messaging adapters for aliases, threads, and conversation ids', () => {
		const feishu = getPlugin('feishu');
		const parsed = feishu.messaging?.parseExplicitTarget('lark:work/chat-1#thread-2');

		expect(parsed).toEqual({
			channelId: 'feishu',
			accountId: 'work',
			targetId: 'chat-1',
			threadId: 'thread-2',
			chatType: 'thread',
			raw: 'lark:work/chat-1#thread-2',
		});
		expect(parsed && feishu.messaging?.resolveSessionTarget(parsed)).toBe(
			'feishu:work:chat-1:thread-2'
		);
		expect(parsed && feishu.messaging?.formatTargetDisplay(parsed)).toBe(
			'feishu:work/chat-1#thread-2'
		);
	});

	it('does not mistake channel-style targets for thread separators', () => {
		const irc = getPlugin('irc');
		const parsed = irc.messaging?.parseExplicitTarget('irc:#ops');

		expect(parsed).toMatchObject({
			channelId: 'irc',
			targetId: '#ops',
			chatType: 'channel',
		});
		expect(parsed?.threadId).toBeUndefined();
	});

	it('normalizes inbound messages for any documented channel when a runtime is registered later', () => {
		const slack = getPlugin('slack');
		const normalized = slack.messaging?.normalizeInbound?.(
			{
				type: 'slack',
				accountId: 'workspace',
				from: 'U123',
				fromName: 'Ada Lovelace',
				chatId: '#ops',
				text: 'hello',
				messageId: 'm1',
				threadId: 't1',
				chatType: 'thread',
				provenance: { transport: 'test' },
			},
			'workspace'
		);

		expect(normalized).toMatchObject({
			channelId: 'slack',
			accountId: 'workspace',
			senderId: 'U123',
			senderName: 'Ada Lovelace',
			targetId: '#ops',
			chatType: 'thread',
			messageId: 'm1',
			threadId: 't1',
			text: 'hello',
			idempotencyKey: 'slack:workspace:#ops:t1:m1',
			provenance: { transport: 'test' },
		});
		expect(
			slack.messaging?.normalizeInbound?.(
				{ type: 'discord', from: 'U123', chatId: '#ops', text: 'hello' },
				'workspace'
			)
		).toBeNull();
	});

	it('adapts top-level and account-scoped settings without leaking runtime support', () => {
		const discord = getPlugin('discord');
		const defaultAccount = discord.config.getDefaultAccount({
			enabled: true,
			token: 'bot-token',
			allowFrom: [' U1 ', 'U1', 'U2'],
			defaultTarget: 'C123',
		});

		expect(defaultAccount).toMatchObject({
			id: 'default',
			label: 'Discord',
			enabled: true,
			configured: true,
			allowFrom: ['U1', 'U2'],
			defaultTargetId: 'C123',
			dmPolicy: 'allowlist',
		});
		expect(discord.config.getDefaultAccount({ enabled: true })).toMatchObject({
			configured: false,
			unconfiguredReason: 'Channel account has no saved provider settings.',
		});
	});
});

function getPlugin(id: ChannelType) {
	const plugin = createBundledCatalogPlugins().find((item) => item.id === id);
	if (!plugin) throw new Error(`Missing test plugin: ${id}`);
	return plugin;
}
