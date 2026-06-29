import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import { Inject, Service } from 'typedi';
import { Settings, Provider } from './index';
import type { Provider as StoredProvider } from '../../shared/providers/types';
import { ProviderService } from '../providers/provider-service';

type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

@Service()
export class StoreService extends Settings {
	private readonly store: Store<SettingsSchema>;

	@Inject(() => ProviderService)
	private readonly providerStore!: ProviderService;

	constructor() {
		super();
		this.store = new Store<SettingsSchema>({
			name: 'settings',
			cwd: path.resolve(resolveAgentSettingsLocation()),
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

function resolveAgentSettingsLocation(): string {
	try {
		return path.join(app.getPath('userData'), 'agent');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.join(path.resolve(base, app?.getName?.() ?? 'Friday'), 'agent');
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
