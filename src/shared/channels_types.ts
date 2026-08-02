import type { StoredProvider } from './provider_types';

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

/** A bot provider credential: the bot token plus who may reach the agent through it. */
export interface StoredBotProvider extends StoredProvider {
	allowFrom?: string[];
	groupAllowFrom?: string[];
	dmPolicy?: ChannelDmPolicy;
}

/** The default channel, stored in app/settings.channels.json. */
export interface Channel {
	/** Provider serving the default channel. */
	providerId: string;
	/** Bot service id of the default channel, as declared in the provider manifest. */
	channelId: string;
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
