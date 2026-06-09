import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerQuery } from './core/gateway';
import { resolveAgentUsageLocation } from '../services/agent-service';
import { Settings } from '../services/settings';
import { AgentStoreChannels } from '../../shared/ipc/ipc-channels';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers/definitions';
import { LLM_MODELS_BY_PROVIDER } from '../../shared/providers/models/llm';
import type { ProviderModel } from '../../shared/providers/models/types';

type AgentModelSelection = {
	provider: PublicProvider;
	model: ProviderModel;
};

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

function getModel(providerId: string, modelId: string): ProviderModel | undefined {
	return LLM_MODELS_BY_PROVIDER[providerId]?.find((model) => model.id === modelId);
}

export class AgentStoreIpc implements IpcModule {
	readonly name = 'agent-store';

	private readonly settings = new Settings(resolveAgentUsageLocation());

	register(_container: MainServiceContainer, _eventBus: EventBus): void {
		registerQuery(AgentStoreChannels.get, (): AgentModelSelection | undefined => {
			const providerId = this.settings.getProviderId();
			const modelId = this.settings.getModelId();
			if (!providerId || !modelId) return undefined;

			const provider = toPublicProvider(providerId);
			const model = getModel(providerId, modelId);
			if (!provider || !model) return undefined;

			return { provider, model };
		});

		registerCommand(
			AgentStoreChannels.set,
			(provider: PublicProvider, model: ProviderModel): boolean => {
				if (!provider.id || !model.id) return false;
				this.settings.setProviderId(provider.id);
				this.settings.setModelId(model.id);
				return true;
			}
		);

		registerQuery(AgentStoreChannels.getProvider, (): PublicProvider | undefined => {
			const providerId = this.settings.getProviderId();
			return providerId ? toPublicProvider(providerId) : undefined;
		});

		registerCommand(AgentStoreChannels.setProvider, (provider: PublicProvider): boolean => {
			if (!provider.id) return false;
			this.settings.setProviderId(provider.id);
			return true;
		});

		registerQuery(AgentStoreChannels.getModelId, (): string | undefined => {
			return this.settings.getModelId();
		});

		registerCommand(AgentStoreChannels.setModelId, (modelId: string): boolean => {
			const trimmed = modelId.trim();
			if (!trimmed) return false;
			this.settings.setModelId(trimmed);
			return true;
		});
	}
}
