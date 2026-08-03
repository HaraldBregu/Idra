import path from 'node:path';
import { existsSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredBotProvider } from '../../../shared';
import { getLegacyBotProviders, removeLegacyBotProviders } from '../settings_store';

export type ChannelsStoreState = { readonly providers: StoredBotProvider[] };

const CHANNELS_STORE_NAME = 'channels';
const DEFAULT_CHANNELS_STORE: ChannelsStoreState = {
	providers: [],
};

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const legacyAppSettingsDirectory = path.resolve(userDataLocation(), 'app');
const hasChannelsStore = existsSync(path.join(settingsDirectory, 'channels.json'));

const store = new Store<ChannelsStoreState>({
	name: CHANNELS_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CHANNELS_STORE,
});

const legacyStore = !hasChannelsStore && existsSync(path.join(legacyAppSettingsDirectory, 'channels.json'))
	? new Store<ChannelsStoreState>({
			name: CHANNELS_STORE_NAME,
			cwd: legacyAppSettingsDirectory,
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_CHANNELS_STORE,
		})
	: undefined;

const current = store.store as unknown as {
	providers?: StoredBotProvider[];
};
const legacyProviders = getLegacyBotProviders() as StoredBotProvider[];
const previousProviders = legacyStore?.store.providers ?? [];
const providers =
	Array.isArray(current.providers) && current.providers.length > 0
		? current.providers
		: previousProviders.length > 0
			? previousProviders
			: legacyProviders;
if (
	!hasChannelsStore ||
	!Array.isArray(current.providers) ||
	previousProviders.length > 0 ||
	legacyProviders.length > 0 ||
	Object.keys(store.store).some((key) => key !== 'providers')
) {
	store.store = {
		providers,
	};
	removeLegacyBotProviders();
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
