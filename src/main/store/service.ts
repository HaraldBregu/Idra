import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type { Assistant } from '../../shared/service';
import { SettingsStore, StoreSchema } from './types';

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;
	}

	getProviderById(id: string): Provider | undefined {
		const providerId = id.trim().toLowerCase();
		return (this.store.get('providers') ?? []).find(
			(provider) => provider.id.trim().toLowerCase() === providerId
		);
	}

	getAssistantService(): Assistant | undefined {
		return this.store.get('service')?.assistant;
	}

	setOpenAiApiKey(key: string): void {
		const providers = this.store.get('providers') ?? [];
		const openAiProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'openai'
		);

		const newProvider: Provider = {
			id: 'openai',
			name: 'OpenAI',
			apikey: key,
			baseURL: 'https://api.openai.com/v1',
		};
		
		if (openAiProviderIndex !== -1) {
			providers[openAiProviderIndex] = newProvider;
		} else {
			providers.push(newProvider);
		}
		this.store.set('providers', providers);
	}

	setAnthropicApiKey(key: string): void {
		const providers = this.store.get('providers') ?? [];
		const anthropicProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'anthropic'
		);

		const newProvider: Provider = {
			id: 'anthropic',
			name: 'Anthropic',
			apikey: key,
			baseURL: 'https://api.anthropic.com/v1',
		};
		
		if (anthropicProviderIndex !== -1) {
			providers[anthropicProviderIndex] = newProvider;
		} else {
			providers.push(newProvider);
		}
		this.store.set('providers', providers);
	}
		 
}
