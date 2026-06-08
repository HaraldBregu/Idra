import Store from 'electron-store';
import { Settings as AgentSettings } from './core/settings';

export type AgentProviderSettings = {
	id: string;
	apiKey: string;
	baseURL: string;
};

type SettingsSchema = {
	provider?: AgentProviderSettings;
	model?: string;
};

export class Settings extends AgentSettings {
	private readonly store: Store<SettingsSchema>;

	constructor() {
		super();
		this.store = new Store<SettingsSchema>({
			name: 'agent.settings',
			accessPropertiesByDotNotation: false,
		});
	}

	getProvider(): AgentProviderSettings | undefined {
		return this.store.get('provider');
	}

	setProvider(provider: AgentProviderSettings): void {
		this.store.set('provider', provider);
	}

	getModel(): string | undefined {
		return this.store.get('model');
	}

	setModel(model: string): void {
		this.store.set('model', model);
	}

	getProviderId(): string | undefined {
		return this.getProvider()?.id;
	}

	getModelId(): string | undefined {
		return this.getModel();
	}
}
