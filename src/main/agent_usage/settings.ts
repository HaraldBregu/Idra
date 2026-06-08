import path from 'node:path';
import Store from 'electron-store';
import { AgentSettings } from '../agent_v2';
import { SettingsProvider } from '../agent_v2/core/settings';

type SettingsSchema = {
	version: number;
	provider: SettingsProvider | undefined;
	modelId: string | undefined;
};

const SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS: SettingsSchema = {
	version: SETTINGS_VERSION,
	provider: undefined,
	modelId: undefined,
};

export class Settings extends AgentSettings {
	private readonly store: Store<SettingsSchema>;

	constructor(location: string) {
		super();
		this.store = new Store<SettingsSchema>({
			name: 'settings',
			cwd: path.resolve(location),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	getVersion(): number {
		return this.store.get('version');
	}

	getProvider(): SettingsProvider | undefined {
		return this.store.get('provider');
	}

	setProvider(provider: SettingsProvider): void {
		this.store.set('provider', provider);
	}

	getModel(): string | undefined {
		return this.store.get('modelId');
	}

	setModel(model: string): void {
		this.store.set('modelId', model);
	}

	getProviderId(): string | undefined {
		return this.getProvider()?.id;
	}

	getModelId(): string | undefined {
		return this.getModel();
	}
}
