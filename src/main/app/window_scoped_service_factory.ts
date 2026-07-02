import type { ContainerInstance } from 'typedi';
import type { EventBus } from './index';
import { LoggerService } from '../shared';

export interface WindowScopedFactoryContext {
	globalContainer: ContainerInstance;
	eventBus: EventBus;
	windowContainer: ContainerInstance;
}

export interface WindowScopedServiceDefinition {
	key: string;
	factory: (context: WindowScopedFactoryContext) => Promise<unknown> | unknown;
}

export class WindowScopedServiceFactory {
	private definitions: Map<string, WindowScopedServiceDefinition> = new Map();

	register(definition: WindowScopedServiceDefinition): void {
		if (this.definitions.has(definition.key)) {
			throw new Error(`Service "${definition.key}" is already registered`);
		}
		this.definitions.set(definition.key, definition);
	}

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

	getRegisteredServices(): string[] {
		return Array.from(this.definitions.keys());
	}

	isRegistered(key: string): boolean {
		return this.definitions.has(key);
	}
}

export function createDefaultWindowScopedServiceFactory(): WindowScopedServiceFactory {
	const factory = new WindowScopedServiceFactory();
	return factory;
}
