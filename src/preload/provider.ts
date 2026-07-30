import { typedInvokeUnwrap } from '../shared/ipc_types';
import { ProviderStoreChannels } from '../shared/ipc_channels_definitions';
import type { ProviderApi } from './index.d';
import type { StoredProvider as Provider } from '../shared/provider_types';
import type { PublicProvider } from '../shared/provider_types';
import type { CatalogModel } from '../shared/model_types';
import type { StorageConfig } from '../shared/storage_types';
import type { Channel } from '../shared/channels_types';

export const provider: ProviderApi = {
	get: (id: string): Promise<Provider | undefined> => {
		return typedInvokeUnwrap(ProviderStoreChannels.get, id);
	},
	set: (provider: Provider): Promise<Provider> => {
		return typedInvokeUnwrap(ProviderStoreChannels.set, provider);
	},
	list: (): Promise<Provider[]> => {
		return typedInvokeUnwrap(ProviderStoreChannels.list);
	},
	getVectorDatabaseProviders: async (): Promise<PublicProvider[]> => {
		// ponytail: aggregates app.models() and filters for embedding providers
		const models: CatalogModel[] = await window.app.models();
		const providersMap = new Map<string, PublicProvider>();
		models.forEach((model) => {
			if (model.type === 'embedding') {
				providersMap.set(model.provider.id, model.provider);
			}
		});
		return Array.from(providersMap.values());
	},
	getModelProviders: async (): Promise<PublicProvider[]> => {
		// ponytail: unique providers from app.models(), overlaid with stored settings data
		const [models, stored] = await Promise.all([
			window.app.models() as Promise<CatalogModel[]>,
			provider.list(),
		]);
		const storedById = new Map(stored.map((entry) => [entry.id, entry]));
		const providersMap = new Map<string, PublicProvider>();
		models.forEach((model) => {
			const saved = storedById.get(model.provider.id);
			providersMap.set(model.provider.id, {
				...model.provider,
				baseUrl: saved?.baseUrl || model.provider.baseUrl,
			});
		});
		return Array.from(providersMap.values());
	},
	getObjectStorageProviders: async (): Promise<StorageConfig[]> => {
		return window.storage.getStorages();
	},
	getChannels: async (): Promise<Channel> => {
		return window.channels.getConfig();
	},
};
