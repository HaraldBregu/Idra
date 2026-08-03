import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { Channel } from '../../../shared';

export type ChannelsStoreState = { readonly providers: Channel };

const CHANNELS_STORE_NAME = 'channels';
const LEGACY_CHANNELS_STORE_NAME = 'settings.channels';

const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providers: {
		providerId: '',
		channelId: '',
	},
};

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

const legacyStore = new Store<Channel>({
	name: LEGACY_CHANNELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: { providerId: '', channelId: '' },
});

if (
	!store.store.providers.providerId &&
	!store.store.providers.channelId &&
	(legacyStore.store.providerId || legacyStore.store.channelId)
) {
	store.store = {
		providers: {
			providerId: legacyStore.store.providerId.trim(),
			channelId: legacyStore.store.channelId.trim(),
		},
	};
	legacyStore.clear();
}

/** The default channel: which provider serves it and which of its bot services it is. */
export function getChannels(): Channel {
	return {
		providerId: getProviderId(),
		channelId: getChannelId(),
	};
}

export function getProviderId(): string {
	const providerId = store.get('providers').providerId;
	return typeof providerId === 'string' ? providerId.trim() : '';
}

export function setProviderId(providerId: string): void {
	store.set('providers', { ...store.get('providers'), providerId: providerId.trim() });
}

export function getChannelId(): string {
	const channelId = store.get('providers').channelId;
	return typeof channelId === 'string' ? channelId.trim() : '';
}

export function setChannelId(channelId: string): void {
	store.set('providers', { ...store.get('providers'), channelId: channelId.trim() });
}
