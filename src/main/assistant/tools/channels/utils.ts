import type {
	Channel,
	DiscordChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../../../../shared/types';

export function stringArg(args: Record<string, unknown>, names: string[]): string | null {
	for (const name of names) {
		const value = args[name];
		if (typeof value === 'string') {
			return value.trim();
		}
	}
	return null;
}

export function stringListArg(args: Record<string, unknown>, names: string[]): string[] | null {
	for (const name of names) {
		const value = args[name];
		if (Array.isArray(value)) {
			return value
				.filter((item): item is string => typeof item === 'string')
				.map((item) => item.trim())
				.filter(Boolean);
		}
		if (typeof value === 'string') {
			return value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);
		}
	}
	return null;
}

export function format(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

export function safeTelegram(properties: TelegramChannelProperties): TelegramChannelProperties {
	return {
		...properties,
		token: mask(properties.token),
	};
}

export function safeWhatsapp(properties: WhatsappChannelProperties): WhatsappChannelProperties {
	return {
		...properties,
		token: mask(properties.token),
	};
}

export function safeDiscord(properties: DiscordChannelProperties): DiscordChannelProperties {
	return {
		...properties,
		token: mask(properties.token),
	};
}

export function safeChannel(channel: Channel): Channel {
	return {
		telegram: safeTelegram(channel.telegram),
		whatsapp: safeWhatsapp(channel.whatsapp),
		discord: safeDiscord(channel.discord),
	};
}

function mask(value: string): string {
	if (!value) return '';
	if (value.length <= 4) return '****';
	return `${value.slice(0, 2)}...${value.slice(-2)}`;
}
