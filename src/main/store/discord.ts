import type { Channel, DiscordChannelProperties } from '../../shared/types';
import type { SettingsStore } from './types';

const DEFAULT_DISCORD_CHANNEL: DiscordChannelProperties = { token: '', allowFrom: [] };

export function getDiscordChannel(store: SettingsStore): DiscordChannelProperties {
	const discord = store.get('channel')?.discord;
	return {
		token: discord?.token ?? DEFAULT_DISCORD_CHANNEL.token,
		allowFrom: [...(discord?.allowFrom ?? DEFAULT_DISCORD_CHANNEL.allowFrom)],
	};
}

export function setDiscordChannel(
	store: SettingsStore,
	properties: DiscordChannelProperties
): Channel {
	const current = store.get('channel');
	const next: Channel = {
		...current,
		discord: {
			token: properties.token,
			allowFrom: [...properties.allowFrom],
		},
	} as Channel;
	store.set('channel', next);
	return next;
}

export function setDiscordToken(store: SettingsStore, token: string): Channel {
	return setDiscordChannel(store, {
		...getDiscordChannel(store),
		token,
	});
}

export function setDiscordAllowFrom(store: SettingsStore, allowFrom: string[]): Channel {
	return setDiscordChannel(store, {
		...getDiscordChannel(store),
		allowFrom: [...allowFrom],
	});
}
