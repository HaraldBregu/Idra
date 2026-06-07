import Store from 'electron-store';
import { Workspace } from './workspace';

type SettingsSchema = Record<string, unknown>;

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
}
