import path from 'node:path';
import ElectronStore from 'electron-store';
import type { Provider } from '../core/types';
import { ProviderService } from '../../providers';
import type { Config } from '../core/config';

export type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

export const DEFAULT_AGENT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

const SETTINGS_STORE_NAME = 'settings';

export class SettingsStore {
	private readonly settings: ElectronStore<SettingsSchema>;
	private readonly providerStore = new ProviderService();

	constructor(private readonly config: Config, defaults: SettingsSchema) {
		this.settings = new ElectronStore<SettingsSchema>({
			name: SETTINGS_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults,
		});
	}

	getProvider(): Provider | undefined {
		const providerId = this.getProviderId();
		if (!providerId) return undefined;
		const provider = this.providerStore.get(providerId);
		if (!provider) return undefined;
		return {
			id: providerId,
			apiKey: provider.apiKey,
			baseURL: provider.baseUrl,
		};
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
		return this.settings.get('version');
	}

	getProviderId(): string | undefined {
		return this.settings.get('providerId');
	}

	setProviderId(providerId: string): void {
		this.settings.set('providerId', providerId);
	}

	setModelId(modelId: string): void {
		this.settings.set('modelId', modelId);
	}

	getModelId(): string | undefined {
		return this.settings.get('modelId');
	}
}
