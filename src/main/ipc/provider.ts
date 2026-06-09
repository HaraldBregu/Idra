import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc/ipc-channels';
import type { Provider } from '../../shared/providers/types';
import { ProviderStoreService } from '../services/provider-store';

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const providerStore = container.get(ProviderStoreService);

		registerQuery(ProviderStoreChannels.get, (id: string) => providerStore.get(id));
		registerCommand(ProviderStoreChannels.set, (id: string, provider: Provider) =>
			providerStore.set(id, provider)
		);
	}
}
