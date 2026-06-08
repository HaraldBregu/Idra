import type { Model } from '../../shared/agents/service';
import { AgentStoreChannels } from '../../shared/ipc-channels';
import type { PublicProvider } from '../../shared/providers';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class AgentStoreIpc implements IpcModule {
	readonly name = 'agent-store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const agentStore = container.get('agentStore');
		const providerStore = container.get('providerStore');

		registerQuery(AgentStoreChannels.get, () => {
			const providerId = agentStore.get()?.provider.id;
			return agentStore.get(providerId ? providerStore.get(providerId) : undefined);
		});
		registerCommand(AgentStoreChannels.set, (provider: PublicProvider, model: Model) =>
			agentStore.set(provider, model, providerStore.get(provider.id))
		);
	}
}
