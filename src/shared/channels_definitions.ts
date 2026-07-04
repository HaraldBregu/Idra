import type { ChannelCatalogEntry, ChannelType } from './channels_types';

export const CHANNEL_CATALOG: readonly ChannelCatalogEntry[] = [
	{
		id: 'discord',
		label: 'Discord',
		blurb: 'Receive and send Discord bot messages.',
		docsPath: 'docs/channels/discord/index.md',
		docsLabel: 'Discord setup',
		brandIconId: 'discord',
		aliases: [],
		order: 20,
		markdownCapable: true,
		exposure: 'preview',
		runtime: 'bundled',
		setupVisible: true,
		catalogVisible: true,
		setupFields: [
			'token',
			'appId',
			'clientId',
			'clientSecret',
			'botUserId',
			'defaultTarget',
			'allowFrom',
			'groupAllowFrom',
		],
		cliHints: ['friday channels setup discord'],
		setupHints: ['Configure Discord accounts from Settings > Channels.'],
	},
	{
		id: 'telegram',
		label: 'Telegram',
		blurb: 'Receive Telegram bot messages and send agent replies.',
		docsPath: 'docs/channels/telegram/index.md',
		docsLabel: 'Telegram setup',
		aliases: [],
		order: 180,
		markdownCapable: true,
		exposure: 'preview',
		runtime: 'bundled',
		setupVisible: true,
		catalogVisible: true,
		setupFields: [
			'token',
			'secret',
			'botUserId',
			'defaultTarget',
			'allowFrom',
			'groupAllowFrom',
			'dmPolicy',
		],
		cliHints: ['friday channels setup telegram'],
		setupHints: ['Configure Telegram accounts from Settings > Channels.'],
	},
];

const CHANNEL_CATALOG_BY_ID = new Map<string, ChannelCatalogEntry>(
	CHANNEL_CATALOG.map((entry) => [entry.id, entry])
);

export function listChannelCatalog(): readonly ChannelCatalogEntry[] {
	return CHANNEL_CATALOG;
}

export function getChannelCatalogEntry(idOrAlias: string): ChannelCatalogEntry | undefined {
	const id = normalizeChannelId(idOrAlias);
	return id ? CHANNEL_CATALOG_BY_ID.get(id) : undefined;
}

export function getChannelBrandIconId(idOrAlias: string): string | undefined {
	return getChannelCatalogEntry(idOrAlias)?.brandIconId;
}

export function buildChannelDocsUrl(docsPath: string, repositoryHomepage: string): string | null {
	const normalizedPath = normalizeChannelDocsPath(docsPath);
	const normalizedHomepage = repositoryHomepage.trim().replace(/\/+$/, '');
	if (!normalizedPath || !/^https?:\/\//.test(normalizedHomepage)) return null;

	const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
	return `${normalizedHomepage}/blob/main/${encodedPath}`;
}

export function normalizeChannelId(idOrAlias: string): ChannelType | null {
	const normalized = idOrAlias.trim().toLowerCase();
	for (const entry of CHANNEL_CATALOG) {
		if (entry.id === normalized || entry.aliases.includes(normalized)) return entry.id;
	}
	return null;
}

export function isChannelId(value: string): value is ChannelType {
	return normalizeChannelId(value) === value;
}

function normalizeChannelDocsPath(value: string): string | null {
	const normalized = value.trim().replace(/^\/+/, '');
	const segments = normalized.split('/');
	if (
		!normalized.startsWith('docs/channels/') ||
		!normalized.endsWith('.md') ||
		segments.some((segment) => !segment || segment === '.' || segment === '..')
	) {
		return null;
	}
	return normalized;
}
