import { getLlmModels, type Model, type ModelSelection } from '../../shared/agents/service';
import { AgentStoreChannels } from '../../shared/ipc-channels';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers';
import { resolveAgentUsageLocation } from '../agent_usage/service';
import { Settings } from '../agent_usage/settings';
import type { EventBus } from '../services/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class AgentStoreIpc implements IpcModule {
	readonly name = 'agent-store';
	private readonly settings = new Settings(resolveAgentUsageLocation());

	register(_container: unknown, _eventBus: EventBus): void {
		registerQuery(AgentStoreChannels.get, () => {
			return this.getSelection();
		});
		registerCommand(AgentStoreChannels.set, (provider: PublicProvider, model: Model) => {
			this.settings.setProvider({
				id: provider.id,
				apiKey: '',
				baseURL: provider.baseUrl,
			});
			this.settings.setModelId(model.id);
			return true;
		});
	}

	private getSelection(): ModelSelection | undefined {
		const settingsProvider = this.settings.getProvider();
		const modelId = this.settings.getModelId();
		if (!settingsProvider || !modelId) return undefined;

		const catalog = DEFAULT_PROVIDERS.find((item) => item.id === settingsProvider.id);
		const publicProvider: PublicProvider = {
			id: settingsProvider.id,
			name: catalog?.name || settingsProvider.id,
			baseUrl: settingsProvider.baseURL || catalog?.baseUrl || '',
			...(catalog?.capabilities ? { capabilities: catalog.capabilities } : {}),
			...(catalog?.apiConfiguration ? { apiConfiguration: catalog.apiConfiguration } : {}),
		};
		const model = getLlmModels(settingsProvider.id).find((item) => item.id === modelId) ?? {
			id: modelId,
			name: modelId,
		};

		return { provider: publicProvider, model };
	}
}
