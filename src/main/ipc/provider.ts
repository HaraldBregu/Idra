import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc_channels_definitions';
import type { Provider } from '../../shared/providers_types';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers_definitions';
import { getProvider, setProvider } from '../providers';
import type { PluginRepository } from '../plugin';

export interface ProviderStoreIpcDeps {
	pluginRepository: PluginRepository;
}

export class ProviderStoreIpc implements IpcModule<ProviderStoreIpcDeps> {
	readonly name = 'provider-store';

	register({ pluginRepository }: ProviderStoreIpcDeps, _eventBus: EventBus): void {
		const builtInCatalog: PublicProvider[] = DEFAULT_PROVIDERS.map((provider) => ({
			id: provider.id,
			name: provider.name,
			baseUrl: provider.baseUrl,
			...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
			...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
		}));
		registerQuery(ProviderStoreChannels.catalog, () => [
			...builtInCatalog,
			...pluginRepository.providers(),
		]);
		registerQuery(ProviderStoreChannels.get, getProvider);
		registerCommand(ProviderStoreChannels.set, (id: string, provider: Provider) =>
			setProvider(id, provider)
		);
	}
}
