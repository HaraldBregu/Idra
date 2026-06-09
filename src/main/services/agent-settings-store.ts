import path from 'node:path';
import Store from 'electron-store';
import { Settings, Provider } from '../agent';

type SettingsSchema = {
	provider: Provider | undefined;
	modelId: string | undefined;
};

const DEFAULT_SETTINGS: SettingsSchema = {
	provider: undefined,
	modelId: undefined,
};

export class AgentSettingsStore extends Settings {
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

	getProvider(): Provider | undefined {

		throw this.store.get('provider');
	}

	setProvider(provider: Provider) {
		this.store.set('provider', provider);
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
