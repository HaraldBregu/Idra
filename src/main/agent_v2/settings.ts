import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';

type SettingsSchema = Record<string, unknown>;

export class Settings {
	private readonly store: Store<SettingsSchema>;

	constructor() {
		this.store = new Store<SettingsSchema>({
			name: 'agent-settings',
			cwd: resolveAppDataPath(),
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

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return path.resolve(process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd());
	}
}
