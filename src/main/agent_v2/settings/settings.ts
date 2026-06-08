import Store from 'electron-store';
import { Workspace } from '../workspace/workspace';

export type AgentProviderSettings = {
	id: string;
	apiKey: string;
	baseURL: string;
};

type SettingsSchema = {
	provider?: AgentProviderSettings;
	model?: string;
};

export class Settings {
	private readonly store: Store<SettingsSchema>;

	constructor(workspace = new Workspace()) {
		this.store = new Store<SettingsSchema>({
			name: 'agent-settings',
			cwd: workspace.getWorkspacePath(),
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
}
