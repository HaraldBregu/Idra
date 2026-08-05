import type { StoredBotProvider } from '../../shared';
import { getChannelProvidersState, setChannelProvidersState } from '../providers/providers_index';

export type ChannelsStoreState = { readonly providers: StoredBotProvider[] };

export function listChannelProviders(): StoredBotProvider[] {
	return getChannelProvidersState();
}

export function getChannelProvider(id: string): StoredBotProvider | undefined {
	return listChannelProviders().find((provider) => provider.id === id);
}

export function setChannelProvider(provider: StoredBotProvider): StoredBotProvider {
	const providers = listChannelProviders();
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	setChannelProvidersState(providers);
	return provider;
}
