import type { Model } from '../../shared/agents/service';
import { AgentStoreChannels } from '../../shared/ipc-channels';
import type { PublicProvider } from '../../shared/providers';
import { AgentStoreService } from '../agent_usage/store';
import type { EventBus } from '../services/event-bus';
import { ProviderStoreService } from '../services/provider/service';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class AgentStoreIpc implements IpcModule {
	readonly name = 'agent-store';
	private readonly agentStore = new AgentStoreService();
	private readonly providerStore = new ProviderStoreService();

	register(_container: unknown, _eventBus: EventBus): void {
		registerQuery(AgentStoreChannels.get, () => {
			const providerId = this.agentStore.get()?.provider.id;
			return this.agentStore.get(providerId ? this.providerStore.get(providerId) : undefined);
		});
		registerCommand(AgentStoreChannels.set, (provider: PublicProvider, model: Model) =>
			this.agentStore.set(provider, model, this.providerStore.get(provider.id))
		);
	}
}
