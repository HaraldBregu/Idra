export interface TelegramChannelProperties {
	token: string;
	allowFrom: string[];
}

export interface WhatsappChannelProperties {
	phoneNumber: string;
	token: string;
}

export interface DiscordChannelProperties {
	token: string;
	allowFrom: string[];
}

export interface Channel {
	telegram: TelegramChannelProperties;
	whatsapp: WhatsappChannelProperties;
	discord: DiscordChannelProperties;
}

export type ChannelType = keyof Channel;

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
