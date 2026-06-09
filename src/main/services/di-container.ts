import { ContainerInstance, Token } from 'typedi';

export interface Disposable {
	destroy(): void | Promise<void>;
}

export type ServiceKey<TServices extends object> = Extract<keyof TServices, string>;

export type ServiceTokenMap<TServices extends object> = {
	[TKey in ServiceKey<TServices>]: Token<TServices[TKey]>;
};

export class TypeDiServiceContainer<TServices extends object = Record<string, unknown>> {
	private readonly tokens = new Map<string, Token<unknown>>();
	private readonly disposables: Disposable[] = [];

	constructor(
		private readonly container: ContainerInstance,
		tokens?: Partial<ServiceTokenMap<TServices>>
	) {
		for (const [key, token] of Object.entries(tokens ?? {})) {
			this.tokens.set(key, token as Token<unknown>);
		}
	}

	register<TKey extends ServiceKey<TServices>>(
		key: TKey,
		instance: TServices[TKey]
	): TServices[TKey] {
		const token = this.tokenFor(key);
		if (this.container.has(token)) {
			throw new Error(`Service "${key}" is already registered`);
		}
		this.container.set(token, instance);
		if (this.isDisposable(instance)) this.disposables.push(instance);
		return instance;
	}

	get<TKey extends ServiceKey<TServices>>(key: TKey): TServices[TKey] {
		const token = this.tokens.get(key);
		if (!token || !this.container.has(token)) {
			throw new Error(`Service "${key}" not found. Was it registered?`);
		}
		return this.container.get(token) as TServices[TKey];
	}

	has<TKey extends ServiceKey<TServices>>(key: TKey): boolean {
		const token = this.tokens.get(key);
		return Boolean(token && this.container.has(token));
	}

	hasUnknown(key: string): boolean {
		const token = this.tokens.get(key);
		return Boolean(token && this.container.has(token));
	}

	getUnknown(key: string): unknown {
		const token = this.tokens.get(key);
		if (!token || !this.container.has(token)) {
			throw new Error(`Service "${key}" not found. Was it registered?`);
		}
		return this.container.get(token);
	}

	async shutdown(): Promise<void> {
		const logger = this.hasUnknown('logger')
			? (this.getUnknown('logger') as {
					info(s: string, m: string, d?: unknown): void;
					error(s: string, m: string, d?: unknown): void;
			  })
			: undefined;

		logger?.info('ServiceContainer', `Shutting down ${this.disposables.length} services...`);
		for (const disposable of [...this.disposables].reverse()) {
			try {
				await disposable.destroy();
			} catch (err) {
				logger?.error('ServiceContainer', 'Error during shutdown', err);
			}
		}
		this.disposables.length = 0;
	}

	private tokenFor(key: string): Token<unknown> {
		const existing = this.tokens.get(key);
		if (existing) return existing;
		const token = new Token<unknown>(key);
		this.tokens.set(key, token);
		return token;
	}

	private isDisposable(obj: unknown): obj is Disposable {
		return (
			typeof obj === 'object' &&
			obj !== null &&
			'destroy' in obj &&
			typeof (obj as Disposable).destroy === 'function'
		);
	}
}
