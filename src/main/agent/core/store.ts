import type { Provider } from '../index';
import type { PersistedCronState } from './cron';
import type { Config } from './config';
import { CronStore } from './store.cron';
import { SettingsStore } from './store.settings';
import { SkillsStore, type SkillSettings } from './store.skills';

export type { SkillSettings } from './store.skills';

export class Store {
	private readonly settings: SettingsStore;
	private readonly cron: CronStore;
	private readonly skills: SkillsStore;

	constructor(private readonly config: Config) {
		this.settings = new SettingsStore(this.config);
		this.cron = new CronStore(this.config);
		this.skills = new SkillsStore(this.config);
	}

	getProvider(): Provider | undefined {
		return this.settings.getProvider();
	}

	setProvider(provider: Provider): void {
		this.settings.setProvider(provider);
	}

	getVersion(): number {
		return this.settings.getVersion();
	}

	getProviderId(): string | undefined {
		return this.settings.getProviderId();
	}

	setProviderId(providerId: string): void {
		this.settings.setProviderId(providerId);
	}

	setModelId(modelId: string): void {
		this.settings.setModelId(modelId);
	}

	getModelId(): string | undefined {
		return this.settings.getModelId();
	}

	all(): Record<string, SkillSettings> {
		return this.skills.all();
	}

	get(id: string): SkillSettings | undefined {
		return this.skills.get(id);
	}

	set(id: string, settings: SkillSettings): void {
		this.skills.set(id, settings);
	}

	remove(id: string): void {
		this.skills.remove(id);
	}

	getCronState(): PersistedCronState {
		return this.cron.getState();
	}

	setCronState(value: PersistedCronState): void {
		this.cron.setState(value);
	}
}
