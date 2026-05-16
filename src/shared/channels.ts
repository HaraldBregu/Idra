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

export type ChannelDmPolicy = 'allowlist' | 'pairing' | 'open' | 'deny';

export interface ChannelAccountProperties {
	label?: string;
	enabled?: boolean;
	allowFrom?: string[];
	groupAllowFrom?: string[];
	defaultTarget?: string;
	dmPolicy?: ChannelDmPolicy;
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
}

export interface TelegramChannelAccountProperties extends ChannelAccountProperties {
	token?: string;
}

export interface WhatsappChannelProperties {
	phoneNumber: string;
	token: string;
}

export interface DiscordChannelProperties {
	token: string;
	allowFrom: string[];
}

export interface GenericChannelProperties {
	enabled?: boolean;
	defaultAccountId?: string;
	accounts?: Record<string, ChannelAccountProperties>;
}

export interface Channel extends Partial<Record<ChannelType, unknown>> {
	telegram: TelegramChannelProperties;
	whatsapp: WhatsappChannelProperties;
	discord: DiscordChannelProperties;
}

export type ChannelConnectionStatus =
	| 'connecting'
	| 'pairing_code'
	| 'connected'
	| 'disconnected'
	| 'error';

export interface ChannelStatusEvent {
	type: ChannelType;
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
	timestamp: number;
}
