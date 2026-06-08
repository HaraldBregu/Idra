import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';

/**
 * A single provider configuration, e.g.:
 * ```json
 * {
 *   "name": "OpenAI",
 *   "apiKey": "sk-proj-...",
 *   "baseUrl": "https://api.openai.com/v1"
 * }
 * ```
 */
export interface Provider {
	name: string;
	apiKey: string;
	baseUrl: string;
}

/** Persisted providers keyed by id. */
export type ProviderRecord = Record<string, Provider>;

/**
 * Minimal electron-store surface used by {@link ProviderService}.
 *
 * electron-store's key-based generics assume a fixed schema, which does not fit a
 * dynamic `Record<string, Provider>`. Reading/writing the whole store object keeps
 * the operations type-safe.
 */
type ProvidersStore = {
	get store(): unknown;
	set store(value: ProviderRecord);
};

export interface ProviderServiceOptions {
	/** Directory to store the providers file in. Defaults to the app's userData path. */
	cwd?: string;
}

/**
 * Stores AI provider configurations (name, api key, base url) in an
 * electron-store file. Providers are keyed by id.
 */
export class ProviderService {
	private readonly store: ProvidersStore;

	constructor(options: ProviderServiceOptions = {}) {
		this.store = new Store<ProviderRecord>({
			name: 'providers',
			cwd: options.cwd ?? resolveUserDataPath(),
			accessPropertiesByDotNotation: false,
		}) as unknown as ProvidersStore;
	}

	/** Returns every stored provider keyed by id. */
	list(): ProviderRecord {
		const raw = this.store.store;
		if (!isRecord(raw)) return {};
		const providers: ProviderRecord = {};
		for (const [id, value] of Object.entries(raw)) {
			if (isProvider(value)) providers[id] = value;
		}
		return providers;
	}

	/** Returns a single provider, or `undefined` when none is stored for `id`. */
	get(id: string): Provider | undefined {
		return this.list()[id];
	}

	/** Whether a provider is stored for `id`. */
	has(id: string): boolean {
		return this.get(id) !== undefined;
	}

	/** Inserts or replaces the provider stored for `id`. */
	set(id: string, provider: Provider): Provider {
		const providers = this.list();
		providers[id] = provider;
		this.store.store = providers;
		return provider;
	}

	/** Removes the provider stored for `id`, if any. */
	delete(id: string): void {
		const providers = this.list();
		if (!(id in providers)) return;
		delete providers[id];
		this.store.store = providers;
	}

	/** Removes every stored provider. */
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
