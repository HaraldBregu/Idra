import type { Channel, TelegramChannelProperties } from '../../shared/types';
import type { SettingsStore } from './types';

const DEFAULT_TELEGRAM_CHANNEL: TelegramChannelProperties = { token: '', allowFrom: [] };

export function getTelegramChannel(store: SettingsStore): TelegramChannelProperties {
	const telegram = store.get('channel')?.telegram;
	return {
		token: telegram?.token ?? DEFAULT_TELEGRAM_CHANNEL.token,
		allowFrom: [...(telegram?.allowFrom ?? DEFAULT_TELEGRAM_CHANNEL.allowFrom)],
	};
}

export function setTelegramChannel(
	store: SettingsStore,
	properties: TelegramChannelProperties
): Channel {
	const current = store.get('channel');
	const next: Channel = {
		...current,
		telegram: {
			token: properties.token,
			allowFrom: [...properties.allowFrom],
		},
	} as Channel;
	store.set('channel', next);
	return next;
}

export function setTelegramToken(store: SettingsStore, token: string): Channel {
	return setTelegramChannel(store, {
		...getTelegramChannel(store),
		token,
	});
}

export function setTelegramAllowFrom(store: SettingsStore, allowFrom: string[]): Channel {
	return setTelegramChannel(store, {
		...getTelegramChannel(store),
		allowFrom: [...allowFrom],
	});
}
