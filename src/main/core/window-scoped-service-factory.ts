import type { ServiceContainer, EventBus } from './index';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';

/**
 * Context available to every window-scoped service factory function.
 */
export interface WindowScopedFactoryContext<TGlobalServices extends object = Record<string, unknown>> {
	globalContainer: ServiceContainer<TGlobalServices>;
	eventBus: EventBus;
	storeService: StoreService;
	windowContainer: ServiceContainer;
}

/**
 * Interface for window-scoped service definitions.
 * Each service registered with the factory must implement this pattern.
 */
export interface WindowScopedServiceDefinition<
	TGlobalServices extends object = Record<string, unknown>,
> {
	/**
	 * Unique key to register the service under
	 */
	key: string;

	/**
	 * Factory function to create the service instance
	 * Has access to global container, event bus, store service, and the
	 * in-progress window container for resolving prior services.
	 */
	factory: (context: WindowScopedFactoryContext<TGlobalServices>) => Promise<unknown> | unknown;
}

/**
 * WindowScopedServiceFactory manages the creation and initialization of per-window services.
 *
 * Benefits:
 *   - Adding new window-scoped services requires only registering them with the factory
 *   - No need to modify WindowContext.initializeServices() for each new service
 *   - Makes the list of window-scoped services explicit and discoverable
 *   - Ensures consistent initialization pattern across all services
 *   - Reduces code duplication in WindowContext
 *
 * Usage:
 *   // Register services
 *   factory.register({
 *     key: 'example',
 *     factory: ({ storeService, eventBus }) => new ExampleService(storeService, eventBus)
 *   })
 *
 *   // Create all services for a window
 *   await factory.createAndRegisterAll(container, { globalContainer, eventBus, storeService })
 */
export class WindowScopedServiceFactory<TGlobalServices extends object = Record<string, unknown>> {
	private definitions: Map<string, WindowScopedServiceDefinition<TGlobalServices>> = new Map();

	/**
	 * Register a service definition
	 */
	register(definition: WindowScopedServiceDefinition<TGlobalServices>): void {
		if (this.definitions.has(definition.key)) {
			throw new Error(`Service "${definition.key}" is already registered`);
		}
		this.definitions.set(definition.key, definition);
	}

	/**
	 * Create and register all services in the container.
	 * Services are created in registration order, allowing dependencies to be satisfied.
	 */
	async createAndRegisterAll(
		container: ServiceContainer,
		context: {
			globalContainer: ServiceContainer<TGlobalServices>;
			eventBus: EventBus;
			storeService: StoreService;
		}
	): Promise<void> {
		const logger = context.globalContainer.getUnknown('logger') as LoggerService;
		logger?.info(
			'WindowScopedServiceFactory',
			`Creating ${this.definitions.size} window-scoped services`
		);

		const enrichedContext: WindowScopedFactoryContext<TGlobalServices> = {
			...context,
			windowContainer: container,
		};

		for (const definition of this.definitions.values()) {
			try {
				const service = await definition.factory(enrichedContext);
				container.register(definition.key, service);
				logger?.info('WindowScopedServiceFactory', `Registered service: ${definition.key}`);
			} catch (error) {
				logger?.error(
					'WindowScopedServiceFactory',
					`Failed to register service "${definition.key}"`,
					error
				);
				throw error;
			}
		}

		logger?.info(
			'WindowScopedServiceFactory',
			'Successfully registered all window-scoped services'
		);
	}

	/**
	 * Get the list of registered service keys
	 */
	getRegisteredServices(): string[] {
		return Array.from(this.definitions.keys());
	}

	/**
	 * Check if a service is registered
	 */
	isRegistered(key: string): boolean {
		return this.definitions.has(key);
	}
}

/**
 * Factory for creating the default set of window-scoped services.
 * Can be overridden or extended by applications that need custom services.
 */
export function createDefaultWindowScopedServiceFactory<
	TGlobalServices extends object = Record<string, unknown>,
>(): WindowScopedServiceFactory<TGlobalServices> {
	const factory = new WindowScopedServiceFactory<TGlobalServices>();
	return factory;
}
