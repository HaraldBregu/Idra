import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type { Assistant, Model, Service } from '../../shared/service';
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

	getProviders(): Provider[] {
		return this.store.get('providers') ?? [];
	}

	getService(): Service | undefined {
		return this.store.get('service');
	}

	getAssistantService(): Assistant | undefined {
		return this.store.get('service')?.assistant;
	}

	getAssistantModel(): Model | undefined {
		return this.store.get('service')?.assistant?.model;
	}

	getAssistantProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.store.get('service')?.assistant?.provider;
	}

	setAssistantService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.store.get('service');
		const next: Service = {
			assistant: {
				provider: {
					id: provider.id,
					name: provider.name,
					baseUrl: provider.baseUrl,
				},
				model,
			},
			rag: current?.rag ?? '',
			ocr: current?.ocr ?? '',
		};
		this.store.set('service', next);
		return true;
	}

	setOpenAiApiKey(key: string): void {
		const providers = this.store.get('providers') ?? [];
		const openAiProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'openai'
		);

		const newProvider: Provider = {
			id: 'openai',
			name: 'OpenAI',
			apiKey: key,
			baseUrl: 'https://api.openai.com/v1',
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
			apiKey: key,
			baseUrl: 'https://api.anthropic.com/v1',
		};
		
		if (anthropicProviderIndex !== -1) {
			providers[anthropicProviderIndex] = newProvider;
		} else {
			providers.push(newProvider);
		}
		this.store.set('providers', providers);
	}
		 
}
