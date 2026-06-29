import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc/ipc-channels';
import type { Provider } from '../../shared/providers/types';
import type { ProviderService } from '../providers';

export interface ProviderStoreIpcDeps {
	providerStore: ProviderService;
}

export class ProviderStoreIpc implements IpcModule<ProviderStoreIpcDeps> {
	readonly name = 'provider-store';

	register({ providerStore }: ProviderStoreIpcDeps, _eventBus: EventBus): void {

		registerQuery(ProviderStoreChannels.get, (id: string) => providerStore.get(id));
		registerCommand(ProviderStoreChannels.set, (id: string, provider: Provider) =>
			providerStore.set(id, provider)
		);
	}
}
