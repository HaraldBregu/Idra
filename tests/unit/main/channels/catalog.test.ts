import {
	extractChannelCatalogFromPackageMetadata,
	listChannelCatalog,
	normalizeChannelId,
} from '../../../../src/main/channels/catalog';

describe('channel catalog', () => {
	it('lists the Friday provider inventory in stable order', () => {
		const ids = listChannelCatalog().map((entry) => entry.id);

		expect(ids).toEqual([
			'clickclack',
			'discord',
			'feishu',
			'googlechat',
			'imessage',
			'irc',
			'line',
			'matrix',
			'mattermost',
			'msteams',
			'nextcloud-talk',
			'nostr',
			'qa-channel',
			'qqbot',
			'signal',
			'slack',
			'synology-chat',
			'telegram',
			'tlon',
			'twitch',
			'whatsapp',
			'zalo',
			'zalouser',
		]);
	});

	it('normalizes aliases to canonical lowercase ids', () => {
		expect(normalizeChannelId('lark')).toBe('feishu');
		expect(normalizeChannelId('gchat')).toBe('googlechat');
		expect(normalizeChannelId('google-chat')).toBe('googlechat');
		expect(normalizeChannelId('imsg')).toBe('imessage');
		expect(normalizeChannelId('teams')).toBe('msteams');
		expect(normalizeChannelId('nc')).toBe('nextcloud-talk');
		expect(normalizeChannelId('twitch-chat')).toBe('twitch');
		expect(normalizeChannelId('zl')).toBe('zalo');
		expect(normalizeChannelId('zlu')).toBe('zalouser');
		expect(normalizeChannelId('unknown')).toBeNull();
	});

	it('falls back to the bundled catalog when package metadata is incomplete', () => {
		expect(extractChannelCatalogFromPackageMetadata({ 'friday.channel': { catalog: [] } })).toBe(
			listChannelCatalog()
		);
	});
});
