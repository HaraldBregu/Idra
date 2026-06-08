import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../observability';
import type { Provider } from '../../shared/providers';

/**
 * Persisted provider configurations keyed by provider id.
 *
 * The stored value mirrors the shared {@link Provider} shape, e.g.:
 * ```json
 * {
 *   "openai": {
 *     "id": "openai",
 *     "name": "OpenAI",
 *     "apiKey": "sk-proj-...",
 *     "baseUrl": "https://api.openai.com/v1"
 *   }
 * }
 * ```
 */
export type ProviderRecord = Record<string, Provider>;

/**
 * Minimal electron-store surface used by {@link ProviderService}.
 *
 * electron-store's key-based generics assume a fixed schema, which does not fit a
 * dynamic `Record<string, Provider>`. Reading/writing the whole store object keeps
 * the operations type-safe, matching the connectors repository pattern.
 */
type ProvidersStore = {
	get store(): unknown;
	set store(value: ProviderRecord);
};

export interface ProviderServiceOptions {
	/** Directory to store the providers file in. Defaults to the app's userData path. */
	readonly cwd?: string;
	readonly logger?: LoggerService;
}

/**
 * Stores AI provider credentials (api key, base url) in an electron-store file.
 *
 * Providers are keyed by their {@link Provider.id}.
 */
export class ProviderService {
	private readonly store: ProvidersStore;
	private readonly logger?: LoggerService;

	constructor(options: ProviderServiceOptions = {}) {
		this.logger = options.logger;
		this.store = new Store<ProviderRecord>({
			name: 'providers',
			cwd: options.cwd ?? resolveUserDataPath(),
			accessPropertiesByDotNotation: false,
		}) as unknown as ProvidersStore;
	}

	/** Returns every stored provider keyed by id. */
	list(): ProviderRecord {
		const raw = this.store.store;
		if (!isRecord(raw)) {
			if (raw !== undefined && !isEmptyObject(raw)) {
				this.logger?.warn('ProviderService', 'Dropped invalid providers store contents');
			}
			return {};
		}
		const providers: ProviderRecord = {};
		for (const [id, value] of Object.entries(raw)) {
			if (isProvider(value)) {
				providers[id] = value;
			} else {
				this.logger?.warn('ProviderService', 'Dropped invalid provider entry', { id });
			}
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

	/**
	 * Inserts or replaces a provider.
	 *
	 * When `provider.id` is omitted it defaults to `id` so the stored value is
	 * self-describing.
	 */
	set(id: string, provider: Provider): Provider {
		const stored: Provider = { ...provider, id: provider.id ?? id };
		const providers = this.list();
		providers[id] = stored;
		this.store.store = providers;
		return stored;
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

function isEmptyObject(value: unknown): boolean {
	return isRecord(value) && Object.keys(value).length === 0;
}

function isProvider(value: unknown): value is Provider {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.apiKey === 'string' &&
		typeof value.baseUrl === 'string'
	);
}
