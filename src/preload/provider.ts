import { typedInvokeUnwrap } from '../shared/ipc_types';
import { ProviderStoreChannels } from '../shared/ipc_channels_definitions';
import type { ProviderApi } from './index.d';
import type { Provider } from '../shared/providers_types';

export const provider: ProviderApi = {
	catalog: () => {
		return typedInvokeUnwrap(ProviderStoreChannels.catalog);
	},
	get: (id: string): Promise<Provider | undefined> => {
		return typedInvokeUnwrap(ProviderStoreChannels.get, id);
	},
	set: (id: string, provider: Provider): Promise<Provider> => {
		return typedInvokeUnwrap(ProviderStoreChannels.set, id, provider);
	},
};
