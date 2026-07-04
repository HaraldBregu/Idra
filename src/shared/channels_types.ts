export const CHANNEL_PROVIDER_IDS = ['discord', 'telegram'] as const;

export type ChannelType = (typeof CHANNEL_PROVIDER_IDS)[number];

export const CHANNEL_DM_POLICIES = ['allowlist', 'pairing', 'open', 'deny'] as const;

export type ChannelDmPolicy = (typeof CHANNEL_DM_POLICIES)[number];

export const CHANNEL_DEFAULT_DM_POLICY: ChannelDmPolicy = 'allowlist';

export const CHANNEL_CONNECTION_STATUSES = [
	'connecting',
	'pairing_code',
	'connected',
	'disconnected',
	'error',
] as const;

export type ChannelConnectionStatus = (typeof CHANNEL_CONNECTION_STATUSES)[number];

export const CHANNEL_RUNTIME_SUPPORT_VALUES = ['bundled', 'catalog-only'] as const;
export const CHANNEL_CATALOG_EXPOSURES = ['stable', 'preview', 'hidden'] as const;
export const CHANNEL_SETUP_FIELDS = [
	'enabled',
	'token',
	'secret',
	'appId',
	'clientId',
	'clientSecret',
	'botUserId',
	'allowFrom',
	'groupAllowFrom',
	'defaultTarget',
	'dmPolicy',
	'heartbeat',
] as const;

export type ChannelRuntimeSupport = (typeof CHANNEL_RUNTIME_SUPPORT_VALUES)[number];
export type ChannelCatalogExposure = (typeof CHANNEL_CATALOG_EXPOSURES)[number];
export type ChannelSetupField = (typeof CHANNEL_SETUP_FIELDS)[number];

export interface ChannelHeartbeatVisibilityConfig {
	showOk?: boolean;
	showAlerts?: boolean;
	useIndicator?: boolean;
}

export interface ChannelAccountProperties {
	label?: string;
	enabled?: boolean;
	token?: string;
	secret?: string;
	appId?: string;
	clientId?: string;
	clientSecret?: string;
	botUserId?: string;
	allowFrom?: string[];
	groupAllowFrom?: string[];
	defaultTarget?: string;
	dmPolicy?: ChannelDmPolicy;
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface TelegramChannelProperties {
	token: string;
	allowFrom: string[];
	enabled?: boolean;
	defaultAccountId?: string;
	defaultTarget?: string;
	dmPolicy?: ChannelDmPolicy;
	groupAllowFrom?: string[];
	accounts?: Record<string, ChannelAccountProperties>;
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface DiscordChannelProperties {
	token: string;
	allowFrom: string[];
	enabled?: boolean;
	defaultAccountId?: string;
	defaultTarget?: string;
	dmPolicy?: ChannelDmPolicy;
	groupAllowFrom?: string[];
	accounts?: Record<string, ChannelAccountProperties>;
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface ChannelDefaultsProperties {
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface Channel {
	defaults?: ChannelDefaultsProperties;
	telegram: TelegramChannelProperties;
	discord: DiscordChannelProperties;
}

export interface ChannelStatusEvent {
	type: ChannelType;
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
	timestamp: number;
}

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
	exposure: ChannelCatalogExposure;
	runtime: ChannelRuntimeSupport;
	setupVisible: boolean;
	catalogVisible: boolean;
	setupFields: readonly ChannelSetupField[];
	cliHints: readonly string[];
	setupHints: readonly string[];
}
