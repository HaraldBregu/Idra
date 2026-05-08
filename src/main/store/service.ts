import Store from 'electron-store';
import type {
	Channel,
	ChannelType,
	DiscordChannelProperties,
	Provider,
	ProviderEntry,
	TelegramChannelProperties,
	UserProfile,
	WhatsappChannelProperties,
} from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';
import {
	DEFAULTS,
	type AssistantConfiguration,
	type SettingsStore,
	type StoreSchema,
} from './types';
import {
	getAnthropicKey,
	getAnthropicModel,
	setAnthropicKey,
	setAnthropicModel,
	setAnthropicProvider,
} from './anthropic';
import {
	getOpenAIKey,
	getOpenAIModel,
	setOpenAIKey,
	setOpenAIModel,
	setOpenAIProvider,
} from './openai';
import {
	cloneProvider,
	cloneProviderEntry,
	normalizeProvider,
	normalizeProviderEntries,
	normalizeProviderInput,
	providerToEntries,
} from './utils';

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;
		this.migrateProviderKey();
	}

	// --- Provider methods ---

	getProvider(): Provider {
		return cloneProvider(this.store.get('providers'));
	}

	getProviders(): ProviderEntry[] {
		return providerToEntries(this.store.get('providers')).map(cloneProviderEntry);
	}

	getProviderById(providerId: string): ProviderEntry | undefined {
		const normalized = providerId.trim();
		return this.getProviders().find((p) => p.id === normalized);
	}

	/**
	 * Upsert a provider entry by its `id` (one entry per providerId).
	 */
	addProvider(provider: ProviderEntry): ProviderEntry {
		const incoming = normalizeProviderInput(provider);
		if (!incoming) {
			throw new Error('Invalid provider');
		}
		if (incoming.id === 'openai') {
			this.setOpenAIProvider(incoming.apiKey, incoming.model);
		} else {
			this.setAnthropicProvider(incoming.apiKey, incoming.model);
		}
		return cloneProviderEntry(incoming);
	}

	setOpenAIProvider(apikey: string, model: string): Provider['openai'] {
		return setOpenAIProvider(this.store, apikey, model);
	}

	getOpenAIKey(): string {
		return getOpenAIKey(this.store);
	}

	getOpenAIModel(): string {
		return getOpenAIModel(this.store);
	}

	setOpenAIKey(apikey: string): Provider['openai'] {
		return setOpenAIKey(this.store, apikey);
	}

	setOpenAIModel(model: string): Provider['openai'] {
		return setOpenAIModel(this.store, model);
	}

	setAnthropicProvider(apikey: string, model: string): Provider['anthropic'] {
		return setAnthropicProvider(this.store, apikey, model);
	}

	getAnthropicKey(): string {
		return getAnthropicKey(this.store);
	}

	getAnthropicModel(): string {
		return getAnthropicModel(this.store);
	}

	setAnthropicKey(apikey: string): Provider['anthropic'] {
		return setAnthropicKey(this.store, apikey);
	}

	setAnthropicModel(model: string): Provider['anthropic'] {
		return setAnthropicModel(this.store, model);
	}

	deleteProvider(providerId: string): void {
		const normalized = providerId.trim() as ProviderEntry['id'];
		if (normalized !== 'openai' && normalized !== 'anthropic') return;
		const current = this.store.get('providers');
		this.store.set('providers', {
			...current,
			[normalized]: { apikey: '', model: '' },
		});
	}

	getAssistantConfiguration(): AssistantConfiguration {
		return { ...this.store.get('assistantConfiguration') };
	}

	getAssistantApiKey(): string {
		return this.store.get('assistantConfiguration').apikey;
	}

	getAssistantModel(): string {
		return this.store.get('assistantConfiguration').model;
	}

	setAssistantConfiguration(apikey: string, model: string): AssistantConfiguration {
		const next: AssistantConfiguration = { apikey, model };
		this.store.set('assistantConfiguration', next);
		return next;
	}

	setAssistantApiKey(apikey: string): AssistantConfiguration {
		return this.setAssistantConfiguration(apikey, this.getAssistantModel());
	}

	setAssistantModel(model: string): AssistantConfiguration {
		return this.setAssistantConfiguration(this.getAssistantApiKey(), model);
	}

	getProfile(): UserProfile | null {
		const profile = this.store.get('profile');
		if (!profile) return null;
		return { firstName: profile.firstName, lastName: profile.lastName };
	}

	setProfile(profile: UserProfile): UserProfile {
		const next: UserProfile = {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		};
		this.store.set('profile', next);
		return next;
	}

	getStartupInfo(): AppStartupInfo {
		return {
			startupCount: 0,
			isFirstRun: false,
			isInitialized: true,
		};
	}

	completeFirstRunConfiguration(
		profile: UserProfile,
		providers: ProviderEntry[]
	): AppStartupInfo {
		const incoming = normalizeProviderEntries(providers).filter(
			(p) => p.apiKey.trim().length > 0
		);
		const current = this.store.get('providers');
		const next = cloneProvider(current);
		for (const entry of incoming) {
			next[entry.id] = { apikey: entry.apiKey, model: entry.model };
		}
		this.store.set('providers', next);
		this.store.set('profile', {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		});

		return this.getStartupInfo();
	}

	// --- Channel methods ---

	getChannel(): Channel | null {
		const channel = this.store.get('channel');
		if (!channel) return null;
		const telegram = channel.telegram ?? { token: '', allowFrom: [] };
		const whatsapp = channel.whatsapp ?? { phoneNumber: '', token: '' };
		const discord = channel.discord ?? { token: '', allowFrom: [] };
		return {
			telegram: { ...telegram, allowFrom: [...telegram.allowFrom] },
			whatsapp: { phoneNumber: whatsapp.phoneNumber ?? '', token: whatsapp.token ?? '' },
			discord: { ...discord, allowFrom: [...discord.allowFrom] },
		};
	}

	setChannelProperties(
		type: ChannelType,
		properties:
			| TelegramChannelProperties
			| WhatsappChannelProperties
			| DiscordChannelProperties
	): Channel {
		const current = this.store.get('channel');
		const baseTelegram = current?.telegram ?? { token: '', allowFrom: [] };
		const baseWhatsapp = current?.whatsapp ?? { phoneNumber: '', token: '' };
		const baseDiscord = current?.discord ?? { token: '', allowFrom: [] };
		const base: Channel = {
			telegram: { ...baseTelegram, allowFrom: [...baseTelegram.allowFrom] },
			whatsapp: {
				phoneNumber: baseWhatsapp.phoneNumber ?? '',
				token: baseWhatsapp.token ?? '',
			},
			discord: { ...baseDiscord, allowFrom: [...baseDiscord.allowFrom] },
		};
		let next: Channel;
		if (type === 'whatsapp') {
			const props = properties as WhatsappChannelProperties;
			next = {
				...base,
				whatsapp: { phoneNumber: props.phoneNumber, token: props.token ?? '' },
			};
		} else {
			const props = properties as TelegramChannelProperties | DiscordChannelProperties;
			next = {
				...base,
				[type]: { token: props.token, allowFrom: [...props.allowFrom] },
			};
		}
		this.store.set('channel', next);
		return next;
	}

	private migrateProviderKey(): void {
		const legacy = this.store.get('provider');
		if (legacy !== undefined) {
			this.store.set('providers', normalizeProvider(legacy));
			this.store.delete('provider');
		}
	}
}
