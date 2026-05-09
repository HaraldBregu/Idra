export interface AppLogEntry {
	timestamp: string;
	level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
	source: string;
	message: string;
}


// ---- IPC Result

interface IpcError {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

interface IpcSuccess<T> {
	success: true;
	data: T;
}

/**
 * Union type for IPC responses.
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError;





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
