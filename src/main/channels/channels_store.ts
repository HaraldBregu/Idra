import path from 'node:path';
import Store from 'electron-store';
import type { StoredBotProvider } from '../../shared';
import { userDataLocation } from '../shared/user_data_location';

export type ChannelsStoreState = { readonly providers: StoredBotProvider[] };

const store = new Store<ChannelsStoreState>({
	name: 'channels',
	cwd: path.resolve(userDataLocation(), 'settings'),
	accessPropertiesByDotNotation: false,
	defaults: { providers: [] },
});

export const channelsStorePath = store.path;

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
