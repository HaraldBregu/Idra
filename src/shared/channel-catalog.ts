import { CHANNEL_PROVIDER_IDS, type ChannelType } from './channels';

export interface ChannelCatalogEntry {
	id: ChannelType;
	label: string;
	blurb: string;
	docsPath: string;
	docsLabel: string;
	brandIconId?: string;
	aliases: readonly string[];
	order: number;
	markdownCapable: boolean;
	exposure: 'stable' | 'preview' | 'hidden';
	setupVisible: boolean;
	catalogVisible: boolean;
	cliHints: readonly string[];
	setupHints: readonly string[];
}

type ChannelCatalogInput = Omit<ChannelCatalogEntry, 'docsLabel' | 'setupVisible' | 'catalogVisible'> &
	Partial<Pick<ChannelCatalogEntry, 'docsLabel' | 'setupVisible' | 'catalogVisible'>>;

const CHANNEL_CATALOG_INPUT: readonly ChannelCatalogInput[] = [
	entry('clickclack', 'ClickClack', 'Connect ClickClack conversations.', [], 10, false),
	entry('discord', 'Discord', 'Receive and send Discord bot messages.', [], 20, true, 'preview', 'discord'),
	entry('feishu', 'Feishu', 'Connect Feishu or Lark chat workspaces.', ['lark'], 30, true),
	entry(
		'googlechat',
		'Google Chat',
		'Connect Google Chat spaces and DMs.',
		['gchat', 'google-chat'],
		40,
		true,
		'preview',
		'google_chat'
	),
	entry('imessage', 'iMessage', 'Route local-device iMessage conversations.', ['imsg'], 50, false),
	entry('irc', 'IRC', 'Connect Internet Relay Chat networks.', ['internet-relay-chat'], 60, false),
	entry('line', 'LINE', 'Connect LINE bot chats.', [], 70, false),
	entry('matrix', 'Matrix', 'Connect Matrix rooms and direct messages.', [], 80, true),
	entry('mattermost', 'Mattermost', 'Connect Mattermost teams and channels.', [], 90, true),
	entry(
		'msteams',
		'Microsoft Teams',
		'Connect Microsoft Teams chats and channels.',
		['teams'],
		100,
		true,
		'preview',
		'microsoft_teams'
	),
	entry(
		'nextcloud-talk',
		'Nextcloud Talk',
		'Connect Nextcloud Talk conversations.',
		['nc-talk', 'nc'],
		110,
		true
	),
	entry('nostr', 'Nostr', 'Connect Nostr direct messages and relays.', [], 120, false),
	entry(
		'qa-channel',
		'QA Channel',
		'Synthetic channel for local QA and contract tests.',
		[],
		130,
		true,
		'hidden'
	),
	entry('qqbot', 'QQ Bot', 'Connect QQ bot conversations.', [], 140, false),
	entry('signal', 'Signal', 'Connect Signal local-device messages.', [], 150, false),
	entry('slack', 'Slack', 'Connect Slack channels, DMs, and threads.', [], 160, true, 'preview', 'slack'),
	entry('synology-chat', 'Synology Chat', 'Connect Synology Chat channels.', [], 170, true),
	entry('telegram', 'Telegram', 'Receive Telegram bot messages and send agent replies.', [], 180, true),
	entry('tlon', 'Tlon', 'Connect Tlon groups and conversations.', [], 190, true),
	entry('twitch', 'Twitch', 'Connect Twitch chat channels.', ['twitch-chat'], 200, false),
	entry('whatsapp', 'WhatsApp', 'Connect WhatsApp web or device sessions.', [], 210, false),
	entry('zalo', 'Zalo', 'Connect Zalo bot conversations.', ['zl'], 220, false),
	entry('zalouser', 'Zalo Personal', 'Connect Zalo personal user sessions.', ['zlu'], 230, false),
];

export const CHANNEL_CATALOG: readonly ChannelCatalogEntry[] = CHANNEL_CATALOG_INPUT.map((item) => ({
	...item,
	docsLabel: item.docsLabel ?? `${item.label} setup`,
	setupVisible: item.setupVisible ?? item.exposure !== 'hidden',
	catalogVisible: item.catalogVisible ?? item.exposure !== 'hidden',
})).sort((left, right) => left.order - right.order);

const CHANNEL_IDS = new Set<string>(CHANNEL_PROVIDER_IDS);
const CHANNEL_ALIAS_TO_ID = new Map<string, ChannelType>();

for (const entry of CHANNEL_CATALOG) {
	CHANNEL_ALIAS_TO_ID.set(entry.id, entry.id);
	for (const alias of entry.aliases) {
		CHANNEL_ALIAS_TO_ID.set(normalizeChannelKey(alias), entry.id);
	}
}

export function listChannelCatalog(): readonly ChannelCatalogEntry[] {
	return CHANNEL_CATALOG;
}

export function getChannelCatalogEntry(idOrAlias: string): ChannelCatalogEntry | undefined {
	const id = normalizeChannelId(idOrAlias);
	return id ? CHANNEL_CATALOG.find((entry) => entry.id === id) : undefined;
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
	const normalized = normalizeChannelKey(idOrAlias);
	return CHANNEL_ALIAS_TO_ID.get(normalized) ?? (CHANNEL_IDS.has(normalized) ? (normalized as ChannelType) : null);
}

export function isChannelId(value: string): value is ChannelType {
	return normalizeChannelId(value) === value;
}

export function extractChannelCatalogFromPackageMetadata(
	metadata: unknown
): readonly ChannelCatalogEntry[] {
	if (!metadata || typeof metadata !== 'object') return CHANNEL_CATALOG;
	const packageMetadata = metadata as Record<string, unknown>;
	const fridayChannel = packageMetadata['friday.channel'];
	if (!fridayChannel || typeof fridayChannel !== 'object') return CHANNEL_CATALOG;
	const catalog = (fridayChannel as { catalog?: unknown }).catalog;
	if (!Array.isArray(catalog)) return CHANNEL_CATALOG;

	const entries = catalog.filter(isPackageCatalogEntry);
	return entries.length === CHANNEL_PROVIDER_IDS.length ? entries : CHANNEL_CATALOG;
}

function entry(
	id: ChannelType,
	label: string,
	blurb: string,
	aliases: readonly string[],
	order: number,
	markdownCapable: boolean,
	exposure: ChannelCatalogEntry['exposure'] = 'preview',
	brandIconId?: string
): ChannelCatalogInput {
	return {
		id,
		label,
		blurb,
		docsPath: `docs/channels/${id}.md`,
		docsLabel: `${label} setup`,
		...(brandIconId ? { brandIconId } : {}),
		aliases,
		order,
		markdownCapable,
		exposure,
		cliHints: [`friday channels setup ${id}`],
		setupHints: [`Configure ${label} accounts from Settings > Channels.`],
	};
}

function normalizeChannelKey(value: string): string {
	return value.trim().toLowerCase();
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

function isPackageCatalogEntry(value: unknown): value is ChannelCatalogEntry {
	if (!value || typeof value !== 'object') return false;
	const item = value as Partial<ChannelCatalogEntry>;
	return (
		typeof item.id === 'string' &&
		CHANNEL_IDS.has(item.id) &&
		typeof item.label === 'string' &&
		typeof item.blurb === 'string' &&
		typeof item.docsPath === 'string' &&
		typeof item.docsLabel === 'string' &&
		(item.brandIconId === undefined || typeof item.brandIconId === 'string') &&
		Array.isArray(item.aliases) &&
		typeof item.order === 'number' &&
		typeof item.markdownCapable === 'boolean' &&
		typeof item.setupVisible === 'boolean' &&
		typeof item.catalogVisible === 'boolean'
	);
}
