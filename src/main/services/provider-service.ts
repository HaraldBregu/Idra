import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';

export interface Provider {
	name: string;
	apiKey: string;
	baseUrl: string;
}

export type ProviderRecord = Record<string, Provider>;

type ProvidersStore = {
	get store(): unknown;
	set store(value: ProviderRecord);
};

export interface ProviderServiceOptions {
	cwd?: string;
}

export class ProviderService {
	private readonly store: ProvidersStore;

	constructor(options: ProviderServiceOptions = {}) {
		this.store = new Store<ProviderRecord>({
			name: 'providers',
			cwd: options.cwd ?? resolveUserDataPath(),
			accessPropertiesByDotNotation: false,
		}) as unknown as ProvidersStore;
	}

	list(): ProviderRecord {
		const raw = this.store.store;
		if (!isRecord(raw)) return {};
		const providers: ProviderRecord = {};
		for (const [id, value] of Object.entries(raw)) {
			if (isProvider(value)) providers[id] = value;
		}
		return providers;
	}

	get(id: string): Provider | undefined {
		return this.list()[id];
	}

	has(id: string): boolean {
		return this.get(id) !== undefined;
	}

	set(id: string, provider: Provider): Provider {
		const providers = this.list();
		providers[id] = provider;
		this.store.store = providers;
		return provider;
	}

	delete(id: string): void {
		const providers = this.list();
		if (!(id in providers)) return;
		delete providers[id];
		this.store.store = providers;
	}

	clear(): void {
		this.store.store = {};
	}
}

function resolveUserDataPath(): string {
	try {
		return app.getPath('userData');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvider(value: unknown): value is Provider {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.apiKey === 'string' &&
		typeof value.baseUrl === 'string'
	);
}
