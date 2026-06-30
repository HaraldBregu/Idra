import path from 'node:path';
import ElectronStore from 'electron-store';
import { app } from 'electron';
import { Provider } from '../index';
import type { Provider as StoredProvider } from '../../../shared/providers/types';
import { ProviderService } from '../../providers';
import { CRON_STORE_DIRECTORY, CRON_STORE_FILE_NAME } from '../cron/util';
import type { PersistedCronState } from '../cron/types';
import type { Config } from './config';

type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

export class Store {
	private readonly store: ElectronStore<SettingsSchema>;
	private readonly providerStore = new ProviderService();

	constructor(private readonly config: Config) {
		this.store = new ElectronStore<SettingsSchema>({
			name: 'settings',
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

export interface SkillSettings {
	enabled: boolean;
}

type SkillsStoreSchema = {
	skills: Record<string, SkillSettings>;
};

const DEFAULT_SKILLS_SETTINGS: SkillsStoreSchema = { skills: {} };

export class SkillsStore {
	private readonly store: ElectronStore<SkillsStoreSchema>;

	constructor(cwd?: string) {
		this.store = new ElectronStore<SkillsStoreSchema>({
			name: 'settings',
			cwd: cwd ?? resolveSkillsRoot(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SKILLS_SETTINGS,
		});
	}

	all(): Record<string, SkillSettings> {
		return this.store.store.skills ?? {};
	}

	get(id: string): SkillSettings | undefined {
		return this.all()[id];
	}

	set(id: string, settings: SkillSettings): void {
		this.store.set('skills', { ...this.all(), [id]: settings });
	}

	remove(id: string): void {
		const next = { ...this.all() };
		delete next[id];
		this.store.set('skills', next);
	}
}

export class CronStore {
	private readonly store: ElectronStore<PersistedCronState>;

	constructor() {
		this.store = new ElectronStore<PersistedCronState>({
			name: CRON_STORE_FILE_NAME,
			cwd: CRON_STORE_DIRECTORY,
			accessPropertiesByDotNotation: false,
			defaults: { schedules: [] },
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
