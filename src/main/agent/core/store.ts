import path from 'node:path';
import ElectronStore from 'electron-store';
import { app } from 'electron';
import { Provider } from '../index';
import type { Provider as StoredProvider } from '../../../shared/providers/types';
import { ProviderService } from '../../providers';

type SettingsSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

@Service()
export class StoreService {
	private readonly store: Store<SettingsSchema>;

	@Inject(() => ProviderService)
	private readonly providerStore!: ProviderService;

	constructor() {
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

export interface SkillSettings {
	enabled: boolean;
}

type SkillsStoreSchema = {
	skills: Record<string, SkillSettings>;
};

const DEFAULT_SKILLS_SETTINGS: SkillsStoreSchema = { skills: {} };

export class SkillsStore {
	private readonly store: Store<SkillsStoreSchema>;

	constructor(cwd?: string) {
		this.store = new Store<SkillsStoreSchema>({
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

export function resolveSkillsRoot(): string {
	try {
		return path.join(app.getPath('appData'), app.getName(), 'skills');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'skills');
	}
}
