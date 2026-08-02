import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { Channel } from '../../../shared';

export type ChannelsStoreState = Channel;

const CHANNELS_STORE_NAME = 'settings.channels';

const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providerId: '',
	channelId: '',
};

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

/** The default channel: which provider serves it and which of its bot services it is. */
export function getChannels(): Channel {
	return {
		providerId: getProviderId(),
		channelId: getChannelId(),
	};
}

export function getProviderId(): string {
	const providerId = store.get('providerId');
	return typeof providerId === 'string' ? providerId.trim() : '';
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId.trim());
}

export function getChannelId(): string {
	const channelId = store.get('channelId');
	return typeof channelId === 'string' ? channelId.trim() : '';
}

export function setChannelId(channelId: string): void {
	store.set('channelId', channelId.trim());
}
