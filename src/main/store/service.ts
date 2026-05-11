import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type { Assistant, Model, Service } from '../../shared/service';
import type { CronTask } from '../../shared/cron';
import type { Channel, ChannelType, TelegramChannelProperties } from '../../shared/channels';
import { SettingsStore, StoreSchema } from './types';
import { getDefaultDataDirectory } from '../utils';

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
			cwd: getDefaultDataDirectory(),
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

	getCronTasks(): CronTask[] {
		return this.store.get('cronTasks') ?? [];
	}

	setCronTasks(tasks: CronTask[]): void {
		this.store.set('cronTasks', tasks);
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
