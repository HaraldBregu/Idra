/**
 * Minimal service container with lifecycle management.
 *
 * Design decision: This is intentionally NOT a full IoC framework.
 * For an Electron main process with ~15 services, a simple typed
 * registry is more appropriate than abstract factories or reflection.
 */

export interface Disposable {
	destroy(): void;
}

export type ServiceKey<TServices extends object> = Extract<keyof TServices, string>;

export class ServiceContainer<TServices extends object = Record<string, unknown>> {
	private services = new Map<string, unknown>();
	private disposables: Disposable[] = [];

	/**
	 * Register a service instance. If it has a destroy() method,
	 * it will be called during shutdown.
	 */
	register<TKey extends ServiceKey<TServices>>(
		key: TKey,
		instance: TServices[TKey]
	): TServices[TKey] {
		if (this.services.has(key)) {
			throw new Error(`Service "${key}" is already registered`);
		}
		this.services.set(key, instance);

		if (this.isDisposable(instance)) {
			this.disposables.push(instance);
		}

		return instance;
	}

	/**
	 * Retrieve a service by key. Throws if not found.
	 */
	get<TKey extends ServiceKey<TServices>>(key: TKey): TServices[TKey] {
		if (!this.services.has(key)) {
			throw new Error(`Service "${key}" not found. Was it registered?`);
		}
		const service = this.services.get(key);
		return service as TServices[TKey];
	}

	/**
	 * Check if a service is registered.
	 */
	has<TKey extends ServiceKey<TServices>>(key: TKey): boolean {
		return this.services.has(key);
	}

	hasUnknown(key: string): boolean {
		return this.services.has(key);
	}

	getUnknown(key: string): unknown {
		if (!this.services.has(key)) {
			throw new Error(`Service "${key}" not found. Was it registered?`);
		}
		return this.services.get(key);
	}

	/**
	 * Gracefully shut down all disposable services in reverse registration order.
	 */
	async shutdown(): Promise<void> {
		const logger = this.services.get('logger') as
			| {
					info(s: string, m: string, d?: unknown): void;
					error(s: string, m: string, d?: unknown): void;
			  }
			| undefined;
		logger?.info('ServiceContainer', `Shutting down ${this.disposables.length} services...`);
		for (const disposable of [...this.disposables].reverse()) {
			try {
				disposable.destroy();
			} catch (err) {
				logger?.error('ServiceContainer', 'Error during shutdown', err);
			}
		}
		this.services.clear();
		this.disposables = [];
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
