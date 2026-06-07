import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';

type AgentSettingsSchema = Record<string, unknown>;

export abstract class AgentStore {
	abstract getItem<T>(key: string): T | undefined;

	abstract setItem<T>(key: string, value: T): void;
}

export class InMemoryAgentStore extends AgentStore {
	private readonly items = new Map<string, unknown>();

	getItem<T>(key: string): T | undefined {
		return this.items.get(key) as T | undefined;
	}

	setItem<T>(key: string, value: T): void {
		this.items.set(key, value);
	}
}

export class Settings extends AgentStore {
	private readonly store: Store<AgentSettingsSchema>;

	constructor() {
		super();
		this.store = new Store<AgentSettingsSchema>({
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
