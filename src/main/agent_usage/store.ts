import type { Model, ModelSelection } from '../../shared/agents/service';
import { getLlmModels } from '../../shared/agents/service';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers';
import type { Provider as StoredProvider } from '../../shared/provider-store';
import { Settings } from './settings';
import { resolveAgentUsageLocation } from './service';

export class AgentStoreService {
	private readonly settings: Settings;

	constructor(location = resolveAgentUsageLocation()) {
		this.settings = new Settings(location);
	}

	get(provider?: StoredProvider): ModelSelection | undefined {
		const settingsProvider = this.settings.getProvider();
		const modelId = this.settings.getModelId();
		if (!settingsProvider || !modelId) return undefined;

		const catalog = DEFAULT_PROVIDERS.find((item) => item.id === settingsProvider.id);
		const publicProvider: PublicProvider = {
			id: settingsProvider.id,
			name: provider?.name || catalog?.name || settingsProvider.id,
			baseUrl: settingsProvider.baseURL || provider?.baseUrl || catalog?.baseUrl || '',
			...(catalog?.capabilities ? { capabilities: catalog.capabilities } : {}),
			...(catalog?.apiConfiguration ? { apiConfiguration: catalog.apiConfiguration } : {}),
		};
		const model = getLlmModels(settingsProvider.id).find((item) => item.id === modelId) ?? {
			id: modelId,
			name: modelId,
		};

		return { provider: publicProvider, model };
	}

	set(provider: PublicProvider, model: Model, storedProvider?: StoredProvider): boolean {
		this.settings.setProvider({
			id: provider.id,
			apiKey: storedProvider?.apiKey ?? '',
			baseURL: storedProvider?.baseUrl || provider.baseUrl || '',
		});
		this.settings.setModel(model.id);
		return true;
	}
}
