import path from 'node:path';
import Store from 'electron-store';
import { AgentSettings } from '../agent_v2';
import { SettingsProvider } from '../agent_v2/core/settings';
 

type SettingsSchema = {
	provider?: SettingsProvider;
	model?: string;
};

export class Settings extends AgentSettings {
	private readonly store: Store<SettingsSchema>;

	constructor(location: string) {
		super();
		this.store = new Store<SettingsSchema>({
			name: 'settings',
			cwd: path.resolve(location),
			accessPropertiesByDotNotation: false,
		});
	}

	getProvider(): SettingsProvider | undefined {
		return this.store.get('provider');
	}

	setProvider(provider: SettingsProvider): void {
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
