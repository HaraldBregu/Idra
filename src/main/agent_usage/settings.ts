import { AgentSettings } from '../agent_v2';
import { SettingsProvider } from '../agent_v2/core/settings';
import type { StoreService } from '../store';

/**
 * Adapter that exposes the agent's configured provider/model to agent_v2.
 *
 * The selection and provider credentials live in the shared StoreService
 * (`llmAgent` settings + the provider list). This class reads from there so the
 * runtime sees the same configuration the user set in the UI, instead of an
 * empty standalone store.
 */
export class Settings extends AgentSettings {
	constructor(private readonly store: StoreService) {
		super();
	}

	getProvider(): SettingsProvider | undefined {
		const providerId = this.store.getAssistantSettings()?.providerId;
		if (!providerId) return undefined;

		const provider = this.store.getProviderById(providerId);
		if (!provider?.apiKey) return undefined;

		return {
			id: provider.id,
			apiKey: provider.apiKey,
			baseURL: provider.baseUrl,
		};
	}

	getProviderId(): string | undefined {
		return this.store.getAssistantSettings()?.providerId;
	}

	getModelId(): string | undefined {
		return this.store.getAssistantSettings()?.modelId;
	}
}
