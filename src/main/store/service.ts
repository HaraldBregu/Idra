import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type { Assistant, Model, Service } from '../../shared/service';
import type { CronTask } from '../../shared/cron';
import type { Channel, ChannelType, TelegramChannelProperties } from '../../shared/channels';
import type { ConnectorConfig } from '../../shared/connectors';
import { SettingsStore, StoreSchema } from './types';

const DEFAULT_CHANNEL: Channel = {
	telegram: {
		token: '',
		allowFrom: [],
	},
	whatsapp: {
		phoneNumber: '',
		token: '',
	},
	discord: {
		token: '',
		allowFrom: [],
	},
};

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

	addProvider(input: Provider): Provider {
		const id = input.id.trim().toLowerCase();
		const providers = this.store.get('providers') ?? [];
		const exists = providers.some((provider) => provider.id.trim().toLowerCase() === id);

		if (exists) {
			throw new Error(`Provider already exists: ${input.id}`);
		}

		const provider: Provider = {
			id,
			name: input.name.trim(),
			baseUrl: input.baseUrl.trim(),
			apiKey: input.apiKey.trim(),
		};

		this.store.set('providers', [...providers, provider]);
		return provider;
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

	getImageGenerationService(): Assistant | undefined {
		return this.store.get('service')?.imageGeneration;
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

	setImageGenerationService(providerId: string, model: Model): boolean {
		const provider = this.getProviderById(providerId);
		if (!provider) {
			return false;
		}
		const current = this.store.get('service');
		const next: Service = {
			assistant: current?.assistant,
			imageGeneration: {
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

	getCronTasks(): CronTask[] {
		return this.store.get('cronTasks') ?? [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.store.set('cronTasks', tasks);
	}

	getConnectors(): ConnectorConfig[] {
		return this.store.get('connectors') ?? [];
	}

	getConnectorById(id: string): ConnectorConfig | undefined {
		return this.getConnectors().find((connector) => connector.id === id);
	}

	setConnectors(connectors: ConnectorConfig[]): void {
		this.store.set('connectors', connectors);
	}

	getChannel(): Channel {
		const channel = this.store.get('channel');
		return {
			telegram: {
				...DEFAULT_CHANNEL.telegram,
				...(channel?.telegram ?? {}),
			},
			whatsapp: {
				...DEFAULT_CHANNEL.whatsapp,
				...(channel?.whatsapp ?? {}),
			},
			discord: {
				...DEFAULT_CHANNEL.discord,
				...(channel?.discord ?? {}),
			},
		};
	}

	getTelegramChannel(): TelegramChannelProperties {
		return this.getChannel().telegram;
	}

	setChannelProperties<TKey extends ChannelType>(
		type: TKey,
		properties: Partial<Channel[TKey]>
	): Channel {
		const current = this.getChannel();
		const next: Channel = {
			...current,
			[type]: {
				...current[type],
				...properties,
			},
		};
		this.store.set('channel', next);
		return next;
	}

	setTelegramChannel(config: TelegramChannelProperties): TelegramChannelProperties {
		return this.setChannelProperties('telegram', {
			token: config.token,
			allowFrom: config.allowFrom,
		}).telegram;
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
