import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
	CHANNEL_ALIASES_BY_ID,
	CHANNEL_BUNDLED_RUNTIME_IDS,
	CHANNEL_CATALOG_BY_ID,
	CHANNEL_CATALOG_ONLY_RUNTIME_IDS,
	CHANNEL_DOCS_PATH_BY_ID,
	CHANNEL_HIDDEN_CATALOG_IDS,
	CHANNEL_RUNTIME_BY_ID,
	CHANNEL_VISIBLE_CATALOG_IDS,
	buildChannelDocsUrl,
	extractChannelCatalogFromPackageMetadata,
	listChannelCatalog,
	normalizeChannelId,
} from '../../../../src/main/channels/catalog';
import {
	CHANNEL_CONNECTION_STATUSES,
	CHANNEL_DEFAULT_ACCOUNT_ID,
	CHANNEL_DM_POLICIES,
} from '../../../../src/shared/channels';

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

	it('keeps catalog docs paths backed by bundled docs files', () => {
		expect(listChannelDocsIds().sort()).toEqual(
			listChannelCatalog()
				.map((entry) => entry.id)
				.sort()
		);

		for (const entry of listChannelCatalog()) {
			expect(entry.docsPath).toBe(`docs/channels/${entry.id}/index.md`);
			expect(CHANNEL_CATALOG_BY_ID[entry.id]).toBe(entry);
			expect(CHANNEL_ALIASES_BY_ID[entry.id]).toEqual(entry.aliases);
			expect(CHANNEL_DOCS_PATH_BY_ID[entry.id]).toBe(entry.docsPath);
			expect(CHANNEL_RUNTIME_BY_ID[entry.id]).toBe(entry.runtime);
			expect(existsSync(path.join(process.cwd(), entry.docsPath))).toBe(true);
			expect(readChannelDocsMetadata(entry.docsPath)).toEqual({
				id: entry.id,
				label: entry.label,
				aliases: [...entry.aliases],
				runtime: entry.runtime,
			});
			expect(buildChannelDocsUrl(entry.docsPath, 'https://github.com/HaraldBregu/friday')).toBe(
				`https://github.com/HaraldBregu/friday/blob/main/docs/channels/${entry.id}/index.md`
			);
		}

		expect(buildChannelDocsUrl('../secrets.md', 'https://github.com/HaraldBregu/friday')).toBeNull();
	});

	it('exports documentation-backed channel id groups', () => {
		expect(CHANNEL_BUNDLED_RUNTIME_IDS).toEqual(['telegram']);
		expect(CHANNEL_CATALOG_ONLY_RUNTIME_IDS).toEqual(
			listChannelCatalog()
				.filter((entry) => entry.runtime === 'catalog-only')
				.map((entry) => entry.id)
		);
		expect(CHANNEL_VISIBLE_CATALOG_IDS).toEqual(
			listChannelCatalog()
				.filter((entry) => entry.catalogVisible)
				.map((entry) => entry.id)
		);
		expect(CHANNEL_HIDDEN_CATALOG_IDS).toEqual(['qa-channel']);
	});

	it('exports shared channel policy constants', () => {
		expect(CHANNEL_DEFAULT_ACCOUNT_ID).toBe('default');
		expect(CHANNEL_DM_POLICIES).toEqual(['allowlist', 'pairing', 'open', 'deny']);
		expect(CHANNEL_CONNECTION_STATUSES).toEqual([
			'connecting',
			'pairing_code',
			'connected',
			'disconnected',
			'error',
		]);
	});

	it('falls back to the bundled catalog when package metadata is incomplete', () => {
		expect(extractChannelCatalogFromPackageMetadata({ 'friday.channel': { catalog: [] } })).toBe(
			listChannelCatalog()
		);
	});
});

function listChannelDocsIds(): string[] {
	const docsRoot = path.join(process.cwd(), 'docs/channels');
	return readdirSync(docsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(path.join(docsRoot, entry.name, 'index.md')))
		.map((entry) => entry.name);
}

function readChannelDocsMetadata(docsPath: string): {
	id: string;
	label: string;
	aliases: string[];
	runtime: 'bundled' | 'catalog-only';
} {
	const markdown = readFileSync(path.join(process.cwd(), docsPath), 'utf8');
	const fields = new Map<string, string>();
	for (const line of markdown.split('\n')) {
		const match = line.match(/^\| ([^|]+) \| (.*?) \|$/);
		if (!match || match[1] === '---') continue;
		fields.set(match[1].trim(), match[2].trim());
	}

	return {
		id: unwrapBackticks(readRequiredField(fields, 'Channel id')),
		label: readRequiredField(fields, 'Label'),
		aliases: parseAliasField(readRequiredField(fields, 'Aliases')),
		runtime: parseRuntimeField(readRequiredField(fields, 'Runtime')),
	};
}

function readRequiredField(fields: Map<string, string>, field: string): string {
	const value = fields.get(field);
	if (!value) throw new Error(`Missing channel docs field: ${field}`);
	return value;
}

function unwrapBackticks(value: string): string {
	return value.replace(/^`|`$/g, '');
}

function parseAliasField(value: string): string[] {
	if (value === 'none') return [];
	return Array.from(value.matchAll(/`([^`]+)`/g), (match) => match[1]);
}

function parseRuntimeField(value: string): 'bundled' | 'catalog-only' {
	if (value === 'Bundled runtime') return 'bundled';
	if (value === 'Catalog-only' || value === 'Hidden catalog-only') return 'catalog-only';
	throw new Error(`Unsupported channel runtime docs value: ${value}`);
}
