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
	cloneProvider,
	cloneProviderEntry,
	normalizeProvider,
	normalizeProviderEntries,
	normalizeProviderInput,
	providerToEntries,
} from './utils';

export class StoreService {
	getAssistantAiSettings(): AssistantAiSettings {
		const settings = normalizeAssistantAiSettings(this.rawStore.get('assistantAi'));
		if (settings.providers.length === 0) {
			const providers = normalizeAssistantAiProviders(this.rawStore.get('providers'));
			if (providers.length > 0) {
				const migrated = { ...settings, providers };
				this.rawStore.set('assistantAi', migrated);
				return cloneAssistantAiSettings(migrated);
			}
		}
		this.rawStore.set('assistantAi', settings);
		return cloneAssistantAiSettings(settings);
	}

	setAssistantAiProviderApiKey(providerId: string, apiKey: string): AssistantAiSettings {
		const id = providerId.trim().toLowerCase();
		if (!PROVIDERS.some((provider) => provider.id === id)) {
			throw new Error('Invalid provider');
		}

		const settings = this.getAssistantAiSettings();
		const providers = settings.providers.filter((provider) => provider.id !== id);
		const trimmedApiKey = apiKey.trim();
		if (trimmedApiKey) {
			providers.push({ id, apiKey: trimmedApiKey });
		}

		const next = { ...settings, providers };
		this.rawStore.set('assistantAi', next);
		this.rawStore.set(
			'providers',
			providers.map((provider) => ({
				id: provider.id,
				name: PROVIDERS.find((entry) => entry.id === provider.id)?.name ?? provider.id,
				apiKey: provider.apiKey,
			}))
		);
		return cloneAssistantAiSettings(next);
	}

	setAssistantAiSelection(selection: AssistantAiSelection): AssistantAiSettings {
		const selectedProvider = selection.selectedProvider.trim().toLowerCase();
		const selectedModel = selection.selectedModel.trim();
		if (!PROVIDERS.some((provider) => provider.id === selectedProvider)) {
			throw new Error('Invalid provider');
		}
		if (!selectedModel) {
			throw new Error('Invalid model');
		}

		const settings = this.getAssistantAiSettings();
		const next = { ...settings, selectedProvider, selectedModel };
		this.rawStore.set('assistantAi', next);
		return cloneAssistantAiSettings(next);
	}

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
		this.setAssistantAiProviderApiKey(providerId, '');
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
		return {
			telegram: this.getTelegramChannel(),
			whatsapp: this.getWhatsappChannel(),
			discord: this.getDiscordChannel(),
		};
	}

	private ensureChannel(): void {
		if (this.store.get('channel')) return;
		this.store.set('channel', {
			telegram: { token: '', allowFrom: [] },
			whatsapp: { phoneNumber: '', token: '' },
			discord: { token: '', allowFrom: [] },
		});
	}

	getTelegramChannel(): TelegramChannelProperties {
		return getTelegramChannel(this.store);
	}

	setTelegramChannel(properties: TelegramChannelProperties): Channel {
		this.ensureChannel();
		return setTelegramChannel(this.store, properties);
	}

	setTelegramToken(token: string): Channel {
		this.ensureChannel();
		return setTelegramToken(this.store, token);
	}

	setTelegramAllowFrom(allowFrom: string[]): Channel {
		this.ensureChannel();
		return setTelegramAllowFrom(this.store, allowFrom);
	}

	getWhatsappChannel(): WhatsappChannelProperties {
		return getWhatsappChannel(this.store);
	}

	setWhatsappChannel(properties: WhatsappChannelProperties): Channel {
		this.ensureChannel();
		return setWhatsappChannel(this.store, properties);
	}

	setWhatsappPhoneNumber(phoneNumber: string): Channel {
		this.ensureChannel();
		return setWhatsappPhoneNumber(this.store, phoneNumber);
	}

	setWhatsappToken(token: string): Channel {
		this.ensureChannel();
		return setWhatsappToken(this.store, token);
	}

	getDiscordChannel(): DiscordChannelProperties {
		return getDiscordChannel(this.store);
	}

	setDiscordChannel(properties: DiscordChannelProperties): Channel {
		this.ensureChannel();
		return setDiscordChannel(this.store, properties);
	}

	setDiscordToken(token: string): Channel {
		this.ensureChannel();
		return setDiscordToken(this.store, token);
	}

	setDiscordAllowFrom(allowFrom: string[]): Channel {
		this.ensureChannel();
		return setDiscordAllowFrom(this.store, allowFrom);
	}

	setChannelProperties(
		type: ChannelType,
		properties:
			| TelegramChannelProperties
			| WhatsappChannelProperties
			| DiscordChannelProperties
	): Channel {
		if (type === 'whatsapp') {
			return this.setWhatsappChannel(properties as WhatsappChannelProperties);
		}
		if (type === 'telegram') {
			return this.setTelegramChannel(properties as TelegramChannelProperties);
		}
		return this.setDiscordChannel(properties as DiscordChannelProperties);
	}

	private migrateProviderKey(): void {
		const legacy = this.store.get('provider');
		if (legacy !== undefined) {
			this.store.set('providers', normalizeProvider(legacy));
			this.store.delete('provider');
		}
	}
}
import { PROVIDERS } from '../../shared/types';
import type { AssistantAiProvider, AssistantAiSelection, AssistantAiSettings } from '../../shared/types';

const DEFAULT_ASSISTANT_AI_PROVIDER = 'openai';
const DEFAULT_ASSISTANT_AI_MODEL = 'gpt-4o-mini';

function isAssistantAiRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeAssistantAiProvider(value: unknown): AssistantAiProvider | null {
	if (!isAssistantAiRecord(value)) return null;
	const id = typeof value.id === 'string' ? value.id.trim().toLowerCase() : '';
	const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : '';
	if (!id || !apiKey || !PROVIDERS.some((provider) => provider.id === id)) return null;
	return { id, apiKey };
}

function normalizeAssistantAiProviders(value: unknown): AssistantAiProvider[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const providers: AssistantAiProvider[] = [];
	for (const entry of value) {
		const provider = normalizeAssistantAiProvider(entry);
		if (!provider || seen.has(provider.id)) continue;
		seen.add(provider.id);
		providers.push(provider);
	}
	return providers;
}

function normalizeAssistantAiSettings(value: unknown): AssistantAiSettings {
	const raw = isAssistantAiRecord(value) ? value : {};
	const providers = normalizeAssistantAiProviders(raw.providers);
	const selectedProvider =
		typeof raw.selectedProvider === 'string' &&
		PROVIDERS.some((provider) => provider.id === raw.selectedProvider.trim().toLowerCase())
			? raw.selectedProvider.trim().toLowerCase()
			: DEFAULT_ASSISTANT_AI_PROVIDER;
	const selectedModel =
		typeof raw.selectedModel === 'string' && raw.selectedModel.trim().length > 0
			? raw.selectedModel.trim()
			: DEFAULT_ASSISTANT_AI_MODEL;
	return { providers, selectedProvider, selectedModel };
}

function cloneAssistantAiSettings(settings: AssistantAiSettings): AssistantAiSettings {
	return {
		providers: settings.providers.map((provider) => ({ ...provider })),
		selectedProvider: settings.selectedProvider,
		selectedModel: settings.selectedModel,
	};
}
