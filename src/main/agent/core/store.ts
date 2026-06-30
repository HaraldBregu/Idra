import path from 'node:path';
import ElectronStore from 'electron-store';
import { app } from 'electron';
import type { Provider } from '../index';
import type { Provider as StoredProvider } from '../../../shared/providers/types';
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
	private readonly providerStore = new ProviderService();

	constructor(private readonly config: Config) {
		this.settings = new ElectronStore<SettingsSchema>({
			name: SETTINGS_STORE_NAME,
			cwd: path.resolve(this.config.location),
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
}

function toRuntimeProvider(id: string, provider: StoredProvider | undefined): Provider | undefined {
	if (!provider) return undefined;
	return {
		id,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
}

export class CronStore {
	private readonly store: ElectronStore<PersistedCronState>;

	constructor(config: Config) {
		this.store = new ElectronStore<PersistedCronState>({
			name: CRON_STORE_NAME,
			cwd: path.resolve(config.location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_CRON_STATE,
		});
	}

	get state(): PersistedCronState {
		return this.store.store;
	}

	set state(value: PersistedCronState) {
		this.store.store = value;
	}
}

export function resolveSkillsRoot(): string {
	try {
		return path.join(app.getPath('appData'), app.getName(), 'skills');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'skills');
	}
}
