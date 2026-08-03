import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { Channel, StoredBotProvider } from '../../../shared';
import { listProviders } from '../settings_store';

export type ChannelsStoreState = Channel & { readonly providers: StoredBotProvider[] };

const CHANNELS_STORE_NAME = 'channels';
const LEGACY_CHANNELS_STORE_NAME = 'settings.channels';

const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providers: [],
	providerId: '',
	channelId: '',
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

const current = store.store as unknown as {
	providers?: Channel | StoredBotProvider[];
	providerId?: string;
	channelId?: string;
};
const previousSelection = Array.isArray(current.providers) ? undefined : current.providers;
const providers = Array.isArray(current.providers)
	? current.providers
	: (listProviders('bots') as StoredBotProvider[]);
const providerId = current.providerId ?? previousSelection?.providerId ?? legacyStore.store.providerId;
const channelId = current.channelId ?? previousSelection?.channelId ?? legacyStore.store.channelId;
if (previousSelection || legacyStore.store.providerId || legacyStore.store.channelId || providers.length > 0) {
	store.store = {
		providers,
		providerId: providerId.trim(),
		channelId: channelId.trim(),
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

export function listChannelProviders(): StoredBotProvider[] {
	return store.get('providers');
}

export function getChannelProvider(id: string): StoredBotProvider | undefined {
	return listChannelProviders().find((provider) => provider.id === id);
}

export function setChannelProvider(provider: StoredBotProvider): StoredBotProvider {
	const providers = listChannelProviders();
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	store.set('providers', providers);
	return provider;
}
