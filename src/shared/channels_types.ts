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
	isolatedSession?: boolean;
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
	isolatedSession?: boolean;
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
	/** Provider serving the default channel. */
	providerId?: string;
	/** Bot service id of the default channel, as declared in the provider manifest. */
	channelId?: string;
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
	brandIconId?: string;
}
