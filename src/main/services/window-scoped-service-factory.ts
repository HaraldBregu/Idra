import type { ContainerInstance } from 'typedi';
import type { EventBus } from './index';
import { LoggerService } from '../observability';

/**
 * Context available to every window-scoped service factory function.
 */
export interface WindowScopedFactoryContext {
	globalContainer: ContainerInstance;
	eventBus: EventBus;
	windowContainer: ContainerInstance;
}

/**
 * Interface for window-scoped service definitions.
 * Each service registered with the factory must implement this pattern.
 */
export interface WindowScopedServiceDefinition {
	/**
	 * Unique key to register the service under
	 */
	key: string;

	/**
	 * Factory function to create the service instance
	 * Has access to global container, event bus, and the
	 * in-progress window container for resolving prior services.
	 */
	factory: (context: WindowScopedFactoryContext) => Promise<unknown> | unknown;
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
 *     factory: ({ eventBus }) => new ExampleService(eventBus)
 *   })
 *
 *   // Create all services for a window
 *   await factory.createAndRegisterAll(container, { globalContainer, eventBus })
 */
export class WindowScopedServiceFactory {
	private definitions: Map<string, WindowScopedServiceDefinition> = new Map();

	/**
	 * Register a service definition
	 */
	register(definition: WindowScopedServiceDefinition): void {
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
		container: ContainerInstance,
		context: {
			globalContainer: ContainerInstance;
			eventBus: EventBus;
		}
	): Promise<void> {
		const logger = context.globalContainer.get(LoggerService);
		logger?.info(
			'WindowScopedServiceFactory',
			`Creating ${this.definitions.size} window-scoped services`
		);

	const enrichedContext: WindowScopedFactoryContext = {
			...context,
			windowContainer: container,
		};

		for (const definition of this.definitions.values()) {
			try {
				const service = await definition.factory(enrichedContext);
				container.set(definition.key, service);
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
export function createDefaultWindowScopedServiceFactory(): WindowScopedServiceFactory {
	const factory = new WindowScopedServiceFactory();
	return factory;
}
