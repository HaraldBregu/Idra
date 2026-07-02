export const CHANNEL_PROVIDER_IDS = [
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
] as const;

export type ChannelType = (typeof CHANNEL_PROVIDER_IDS)[number];

export const CHANNEL_DEFAULT_ACCOUNT_ID = 'default';

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
	serverUrl?: string;
	webhookUrl?: string;
	appId?: string;
	clientId?: string;
	clientSecret?: string;
	username?: string;
	phoneNumber?: string;
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
	accounts?: Record<string, TelegramChannelAccountProperties>;
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface TelegramChannelAccountProperties extends ChannelAccountProperties {
	token?: string;
}

export interface WhatsappChannelProperties {
	phoneNumber: string;
	token: string;
	enabled?: boolean;
	defaultAccountId?: string;
	defaultTarget?: string;
	dmPolicy?: ChannelDmPolicy;
	allowFrom?: string[];
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

export interface GenericChannelProperties {
	enabled?: boolean;
	defaultAccountId?: string;
	accounts?: Record<string, ChannelAccountProperties>;
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

export interface ChannelDefaultsProperties {
	heartbeat?: ChannelHeartbeatVisibilityConfig;
}

type ChannelConfigById = {
	[id in ChannelType]: GenericChannelProperties;
};

export interface Channel extends ChannelConfigById {
	defaults?: ChannelDefaultsProperties;
	telegram: TelegramChannelProperties;
	whatsapp: WhatsappChannelProperties;
	discord: DiscordChannelProperties;
}

export interface ChannelStatusEvent {
	type: ChannelType;
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
	timestamp: number;
}
