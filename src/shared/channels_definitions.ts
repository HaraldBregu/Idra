import { CHANNEL_PROVIDER_IDS, type ChannelCatalogEntry, type ChannelType } from './channels_types';

export const CHANNEL_CATALOG: readonly ChannelCatalogEntry[] = [
	{
		id: 'discord',
		label: 'Discord',
		blurb: 'Receive and send Discord bot messages.',
		docsPath: 'docs/channels/discord/index.md',
		docsLabel: 'Discord setup',
		brandIconId: 'discord',
	},
	{
		id: 'telegram',
		label: 'Telegram',
		blurb: 'Receive Telegram bot messages and send agent replies.',
		docsPath: 'docs/channels/telegram/index.md',
		docsLabel: 'Telegram setup',
		brandIconId: 'telegram',
	},
];

const CHANNEL_CATALOG_BY_ID = new Map<string, ChannelCatalogEntry>(
	CHANNEL_CATALOG.map((entry) => [entry.id, entry])
);

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
	return isChannelId(normalized) ? normalized : null;
}

export function isChannelId(value: string): value is ChannelType {
	return (CHANNEL_PROVIDER_IDS as readonly string[]).includes(value);
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
