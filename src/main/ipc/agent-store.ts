import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { resolveAgentUsageLocation } from '../services/agent-service';
import { AgentSettingsStore } from '../services/agent-settings-store';
import { AgentStoreChannels } from '../../shared/ipc/ipc-channels';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers/definitions';
function toPublicProvider(providerId: string): PublicProvider | undefined {
	const catalogProvider = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
	if (!catalogProvider) return undefined;
	return {
		id: catalogProvider.id,
		name: catalogProvider.name,
		baseUrl: catalogProvider.baseUrl,
		...(catalogProvider.capabilities ? { capabilities: catalogProvider.capabilities } : {}),
		...(catalogProvider.apiConfiguration
			? { apiConfiguration: catalogProvider.apiConfiguration }
			: {}),
	};
}

export class AgentStoreIpc implements IpcModule {
	readonly name = 'agent-store';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const settings = container.get(AgentSettingsStore);

		registerQuery(AgentStoreChannels.getProvider, (): PublicProvider | undefined => {
			const providerId = settings.getProviderId();
			return providerId ? toPublicProvider(providerId) : undefined;
		});

		registerCommand(AgentStoreChannels.setProvider, (provider: PublicProvider): boolean => {
			if (!provider.id) return false;
			settings.setProviderId(provider.id);
			return true;
		});

		registerQuery(AgentStoreChannels.getModelId, (): string | undefined => {
			return settings.getModelId();
		});

		registerCommand(AgentStoreChannels.setModelId, (modelId: string): boolean => {
			const trimmed = modelId.trim();
			if (!trimmed) return false;
			settings.setModelId(trimmed);
			return true;
		});
	}
}
