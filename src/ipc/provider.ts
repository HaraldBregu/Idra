import type { IpcModule } from './core/module';
import type { EventBus } from '../event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc_channels_definitions';
import type { StoredProvider as Provider, StoredProviderKind } from '../../shared/provider_types';
import type { StoredBotProvider } from '../../shared/channels_types';
import { getProvider, listProviders, setProvider } from '../settings_store';
import { getChannelProvider, listChannelProviders, setChannelProvider } from '../channels';
type ProviderStoreRecord = Provider | StoredBotProvider;

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(_deps: undefined, _eventBus: EventBus): void {
		registerQuery(
			ProviderStoreChannels.get,
			(id: string) => getProvider(id) ?? getChannelProvider(id)
		);
		registerQuery(ProviderStoreChannels.list, () => [
			...listProviders('models'),
			...listProviders('databases'),
			...listChannelProviders(),
		]);
		registerCommand(
			ProviderStoreChannels.set,
			(provider: ProviderStoreRecord, kind?: StoredProviderKind) =>
				kind === 'bots'
					? setChannelProvider(provider as StoredBotProvider)
					: setProvider(provider as Provider, kind)
		);
	}
}
