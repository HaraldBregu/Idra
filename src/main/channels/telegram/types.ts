export interface TelegramAdapterOptions {
	token: string;
	allowFrom: readonly string[];
	accountId?: string;
	defaultTarget?: string;
}

export interface TelegramMessagePayload {
	from: string;
	chatId: string;
	text: string;
	messageId?: string;
	threadId?: string;
	chatType?: 'dm' | 'group' | 'channel' | 'thread';
	fromName?: string;
	provenance?: Record<string, unknown>;
}

export type TelegramMessageEmit = (message: TelegramMessagePayload) => void;
