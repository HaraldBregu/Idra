import type { IpcModule } from './core/module';
import type { EventBus } from '../event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc_channels_definitions';
import type { StoredProvider as Provider, StoredProviderKind } from '../../shared/provider_types';
import { getProvider, listProviders, setProvider } from '../settings_store';
import { getChannelProvider, listChannelProviders, setChannelProvider } from '../channels';

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(_deps: undefined, _eventBus: EventBus): void {
		registerQuery(ProviderStoreChannels.get, (id: string) => getProvider(id) ?? getChannelProvider(id));
		registerQuery(ProviderStoreChannels.list, () => [
			...listProviders('models'),
			...listProviders('databases'),
			...listChannelProviders(),
		]);
		registerCommand(ProviderStoreChannels.set, (provider: Provider, kind?: StoredProviderKind) =>
			kind === 'bots' ? setChannelProvider(provider) : setProvider(provider, kind)
		);
	}
}
