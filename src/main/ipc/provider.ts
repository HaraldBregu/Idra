import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc_channels_definitions';
import type { StoredProvider as Provider } from '../../shared/provider_types';
import { getProvider, listProviders, setProvider } from '../app/settings_store';

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(_deps: undefined, _eventBus: EventBus): void {
		registerQuery(ProviderStoreChannels.get, getProvider);
		registerQuery(ProviderStoreChannels.list, () => listProviders());
		registerCommand(ProviderStoreChannels.set, (provider: Provider) => setProvider(provider));
	}
}
