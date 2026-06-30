import path from 'node:path';
import ElectronStore from 'electron-store';
import type { Provider } from '../index';
import { ProviderService } from '../../providers';
import type { PersistedCronState } from './cron';
import type { Config } from './config';

export interface SkillSettings {
	enabled: boolean;
}

type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
	skills: Record<string, SkillSettings>;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
	skills: {},
};

const SETTINGS_STORE_NAME = 'settings';
const CRON_STORE_NAME = 'cron';
const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };

export class Store {
	private readonly settings: ElectronStore<SettingsSchema>;
	private readonly cron: ElectronStore<PersistedCronState>;
	private readonly providerStore = new ProviderService();

	constructor(private readonly config: Config) {
		this.settings = new ElectronStore<SettingsSchema>({
			name: SETTINGS_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
		this.cron = new ElectronStore<PersistedCronState>({
			name: CRON_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_CRON_STATE,
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

	all(): Record<string, SkillSettings> {
		return this.settings.store.skills ?? {};
	}

	get(id: string): SkillSettings | undefined {
		return this.all()[id];
	}

	set(id: string, settings: SkillSettings): void {
		this.settings.set('skills', { ...this.all(), [id]: settings });
	}

	remove(id: string): void {
		const next = { ...this.all() };
		delete next[id];
		this.settings.set('skills', next);
	}

	getCronState(): PersistedCronState {
		return this.cron.store;
	}

	setCronState(value: PersistedCronState): void {
		this.cron.store = value;
	}
}
