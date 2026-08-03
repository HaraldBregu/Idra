import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredBotProvider } from '../../../shared';
import { clearBotProviders, listProviders } from '../settings_store';

export type ChannelsStoreState = { readonly providers: StoredBotProvider[] };

const CHANNELS_STORE_NAME = 'channels';
const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providers: [],
};

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

const current = store.store as unknown as {
	providers?: StoredBotProvider[];
};
const legacyProviders = listProviders('bots') as StoredBotProvider[];
const providers =
	Array.isArray(current.providers) && current.providers.length > 0 ? current.providers : legacyProviders;
if (
	!Array.isArray(current.providers) ||
	legacyProviders.length > 0 ||
	Object.keys(store.store).some((key) => key !== 'providers')
) {
	store.store = {
		providers,
	};
	clearBotProviders();
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
