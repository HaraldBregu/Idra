export interface TelegramAdapterOptions {
	token: string;
	allowFrom: readonly string[];
}

export interface TelegramMessagePayload {
	from: string;
	chatId: string;
	text: string;
}

export type TelegramMessageEmit = (message: TelegramMessagePayload) => void;
