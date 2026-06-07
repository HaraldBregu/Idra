import Store from 'electron-store';
import { Workspace } from './workspace';

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

	getItem<T>(key: string): T | undefined {
		return this.store.get(key) as T | undefined;
	}

	setItem<T>(key: string, value: T): void {
		this.store.set(key, value);
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
