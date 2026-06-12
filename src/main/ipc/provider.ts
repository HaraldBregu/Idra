import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc/ipc-channels';
import type { Provider } from '../../shared/providers/types';
import { ProviderService } from '../services/provider-service';

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const providerStore = container.get(ProviderService);

		registerQuery(ProviderStoreChannels.get, (id: string) => providerStore.get(id));
		registerCommand(ProviderStoreChannels.set, (id: string, provider: Provider) =>
			providerStore.set(id, provider)
		);
	}
}
