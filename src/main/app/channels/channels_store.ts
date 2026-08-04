import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredBotProvider } from '../../../shared';

export type ChannelsStoreState = { readonly providers: StoredBotProvider[] };

const CHANNELS_STORE_NAME = 'channels';
const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providers: [],
};

const settingsDirectory = path.resolve(userDataLocation(), 'settings');

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

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
