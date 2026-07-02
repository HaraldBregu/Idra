import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ProviderStoreChannels } from '../../shared/ipc/ipc-channels';
import type { Provider } from '../../shared/providers.types';
import { getProvider, setProvider } from '../providers';

export class ProviderStoreIpc implements IpcModule {
	readonly name = 'provider-store';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(ProviderStoreChannels.get, getProvider);
		registerCommand(ProviderStoreChannels.set, (id: string, provider: Provider) =>
			setProvider(id, provider)
		);
	}
}
