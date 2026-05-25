import { DEFAULT_PROVIDERS, type Provider } from '../../shared/providers';
import type { ModelProviderSettings, SettingsStoreAccessor } from './types';

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function defaultProviderForId(id: string): Provider | undefined {
	const providerId = id.trim().toLowerCase();
	return DEFAULT_PROVIDERS.find((provider) => provider.id.trim().toLowerCase() === providerId);
}

function providerFromSettings(settings: ModelProviderSettings): Provider {
	return {
		...(defaultProviderForId(settings.id) ?? {}),
		...settings,
	};
}

function modelProviderSettings(provider: Provider): ModelProviderSettings {
	const settings: ModelProviderSettings = {
		id: provider.id.trim().toLowerCase(),
		name: provider.name.trim(),
		baseUrl: provider.baseUrl.trim(),
		apiKey: provider.apiKey.trim(),
	};
	const capabilities = provider.capabilities?.trim();
	if (capabilities) settings.capabilities = capabilities;
	if (provider.apiConfiguration) settings.apiConfiguration = provider.apiConfiguration;
	const enabled = (provider as { enabled?: unknown }).enabled;
	if (typeof enabled === 'boolean') settings.enabled = enabled;
	return settings;
}

function readModelProviderSettings(value: unknown): ModelProviderSettings | undefined {
	const record = readRecord(value);
	if (!record) return undefined;
	const id = typeof record.id === 'string' ? record.id.trim().toLowerCase() : '';
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	const baseUrl = typeof record.baseUrl === 'string' ? record.baseUrl.trim() : '';
	const apiKey = typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
	if (!id || !name || !baseUrl) return undefined;
	const settings: ModelProviderSettings = { id, name, baseUrl, apiKey };
	const capabilities = typeof record.capabilities === 'string' ? record.capabilities.trim() : '';
	if (capabilities) settings.capabilities = capabilities;
	const apiConfiguration = readRecord(record.apiConfiguration);
	if (apiConfiguration) {
		settings.apiConfiguration = apiConfiguration as unknown as Provider['apiConfiguration'];
	}
	if (typeof record.enabled === 'boolean') settings.enabled = record.enabled;
	return settings;
}

function readModelProviderSettingsList(value: unknown): ModelProviderSettings[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		const provider = readModelProviderSettings(entry);
		return provider ? [provider] : [];
	});
}

export class ProviderStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getProviderById(id: string): Provider | undefined {
		const providerId = id.trim().toLowerCase();
		return this.getStoredModelProviders().find(
			(provider) => provider.id.trim().toLowerCase() === providerId
		);
	}

	getProviders(): Provider[] {
		return this.getStoredModelProviders();
	}

	addProvider(input: Provider): Provider {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredModelProviders();
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

		this.setStoredModelProviders([...providers, provider]);
		return provider;
	}

	upsertProvider(input: Provider): void {
		const id = input.id.trim().toLowerCase();
		const providers = this.getStoredModelProviders();
		const index = providers.findIndex((p) => p.id.trim().toLowerCase() === id);
		const record: Provider = {
			id,
			name: input.name.trim(),
			baseUrl: input.baseUrl.trim(),
			apiKey: input.apiKey.trim(),
		};
		if (index !== -1) {
			providers[index] = record;
		} else {
			providers.push(record);
		}
		this.setStoredModelProviders(providers);
	}

	setOpenAiApiKey(key: string): void {
		const providers = this.getStoredModelProviders();
		const openAiProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'openai'
		);

		const newProvider: Provider = {
			...(defaultProviderForId('openai') ?? {}),
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
		this.setStoredModelProviders(providers);
	}

	setAnthropicApiKey(key: string): void {
		const providers = this.getStoredModelProviders();
		const anthropicProviderIndex = providers.findIndex(
			(provider) => provider.id.trim().toLowerCase() === 'anthropic'
		);

		const newProvider: Provider = {
			...(defaultProviderForId('anthropic') ?? {}),
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
		this.setStoredModelProviders(providers);
	}

	private getStoredModelProviders(): Provider[] {
		return readModelProviderSettingsList(this.store.get('modelProviders')).map(
			providerFromSettings
		);
	}

	private setStoredModelProviders(providers: Provider[]): void {
		this.store.set('modelProviders', providers.map(modelProviderSettings));
	}
}
