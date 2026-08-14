import type { EventBus } from './event_bus';
import type { LoggerService } from './shared';

export interface WindowScopedFactoryContext {
	logger: LoggerService | undefined;
	eventBus: EventBus;
	windowServices: Map<string, unknown>;
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
		windowServices: Map<string, unknown>,
		context: {
			logger: LoggerService | undefined;
			eventBus: EventBus;
		}
	): Promise<void> {
		const { logger, eventBus } = context;
		logger?.info(
			'WindowScopedServiceFactory',
			`Creating ${this.definitions.size} window-scoped services`
		);

		const enrichedContext: WindowScopedFactoryContext = {
			logger,
			eventBus,
			windowServices,
		};

		for (const definition of this.definitions.values()) {
			try {
				const service = await definition.factory(enrichedContext);
				windowServices.set(definition.key, service);
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
	return new WindowScopedServiceFactory();
}
