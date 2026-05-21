import { existsSync } from 'node:fs';
import path from 'node:path';
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

	it('exposes catalog visibility and local brand icon names', () => {
		const catalog = listChannelCatalog();
		const iconRoot = path.join(process.cwd(), 'resources/icons/brands');

		expect(catalog.find((entry) => entry.id === 'qa-channel')?.catalogVisible).toBe(false);
		expect(catalog.find((entry) => entry.id === 'discord')?.brandIconId).toBe('discord');
		expect(catalog.find((entry) => entry.id === 'googlechat')?.brandIconId).toBe('google_chat');
		expect(catalog.find((entry) => entry.id === 'msteams')?.brandIconId).toBe('microsoft_teams');
		expect(catalog.find((entry) => entry.id === 'slack')?.brandIconId).toBe('slack');

		for (const entry of catalog) {
			if (!entry.brandIconId) continue;
			const folder = path.join(iconRoot, entry.brandIconId);
			expect(existsSync(path.join(folder, `${entry.brandIconId}_light.png`))).toBe(true);
			expect(existsSync(path.join(folder, `${entry.brandIconId}_dark.png`))).toBe(true);
		}
	});

	it('falls back to the bundled catalog when package metadata is incomplete', () => {
		expect(extractChannelCatalogFromPackageMetadata({ 'friday.channel': { catalog: [] } })).toBe(
			listChannelCatalog()
		);
	});
});
