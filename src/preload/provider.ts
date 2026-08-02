import { typedInvokeUnwrap } from '../shared/ipc_types';
import { ProviderStoreChannels } from '../shared/ipc_channels_definitions';
import type { ProviderApi } from './index.d';
import type { StoredProvider as Provider, StoredProviderKind } from '../shared/provider_types';
import type { PublicProvider } from '../shared/provider_types';
import type { Channel } from '../shared/channels_types';

/** Unique providers from catalog entries, overlaid with stored settings data. */
async function uniqueProvidersWithStored(
	entries: readonly { provider: PublicProvider }[]
): Promise<PublicProvider[]> {
	const stored = await provider.list();
	const storedById = new Map(stored.map((entry) => [entry.id, entry]));
	const providersMap = new Map<string, PublicProvider>();
	entries.forEach((entry) => {
		const saved = storedById.get(entry.provider.id);
		providersMap.set(entry.provider.id, {
			...entry.provider,
			baseUrl: saved?.baseUrl || entry.provider.baseUrl,
		});
	});
	return Array.from(providersMap.values());
}

export const provider: ProviderApi = {
	get: (id: string): Promise<Provider | undefined> => {
		return typedInvokeUnwrap(ProviderStoreChannels.get, id);
	},
	set: (provider: Provider, kind?: StoredProviderKind): Promise<Provider> => {
		return typedInvokeUnwrap(ProviderStoreChannels.set, provider, kind);
	},
	list: (): Promise<Provider[]> => {
		return typedInvokeUnwrap(ProviderStoreChannels.list);
	},
	getModelProviders: async (): Promise<PublicProvider[]> => {
		return uniqueProvidersWithStored(await window.app.models());
	},
	getStorageProviders: async (): Promise<PublicProvider[]> => {
		return uniqueProvidersWithStored(await window.app.storages());
	},
	getDatabaseProviders: async (): Promise<PublicProvider[]> => {
		return uniqueProvidersWithStored(await window.app.databases());
	},
	getChannels: async (): Promise<Channel> => {
		return window.app.getChannels();
	},
};
