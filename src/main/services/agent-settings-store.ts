import path from 'node:path';
import Store from 'electron-store';
import { Settings, Provider } from '../agent';
import type { ProviderStoreService } from './provider-store';
import type { Provider as StoredProvider } from '../../shared/providers/types';

type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

export class AgentSettingsStore extends Settings {
	private readonly store: Store<SettingsSchema>;
	private readonly providerStore: ProviderStoreService;

	constructor(location: string, providerStore: ProviderStoreService) {
		super();
		this.providerStore = providerStore;
		this.store = new Store<SettingsSchema>({
			name: 'settings',
			cwd: path.resolve(location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	getProvider(): Provider | undefined {
		const providerId = this.getProviderId();
		if (!providerId) return undefined;
		return toRuntimeProvider(providerId, this.providerStore.get(providerId));
	}

	setProvider(provider: Provider): void {
		const existing = this.providerStore.get(provider.id);
		this.providerStore.set(provider.id, {
			name: existing?.name ?? provider.id,
			apiKey: provider.apiKey,
			baseUrl: provider.baseURL,
		});
		this.setProviderId(provider.id);
	}

	getVersion(): number {
		return this.store.get('version');
	}

	getProviderId(): string | undefined {
		return this.store.get('providerId');
	}

	setProviderId(providerId: string): void {
		this.store.set('providerId', providerId);
	}

	setModelId(modelId: string): void {
		this.store.set('modelId', modelId);
	}

	getModelId(): string | undefined {
		return this.store.get('modelId');
	}
}

function toRuntimeProvider(id: string, provider: StoredProvider | undefined): Provider | undefined {
	if (!provider) return undefined;
	return {
		id,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
}
