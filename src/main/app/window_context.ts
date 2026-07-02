import { BrowserWindow } from 'electron';
import { Container, type ContainerInstance } from 'typedi';
import type { EventBus } from './index';
import { LoggerService } from '../shared';
import {
	createDefaultWindowScopedServiceFactory,
	type WindowScopedServiceFactory,
} from './window_scoped_service_factory';

type WindowContextLogger = {
	info(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
};

export interface WindowContextConfig {
	window: BrowserWindow;
	globalContainer: ContainerInstance;
	eventBus: EventBus;
	serviceFactory?: WindowScopedServiceFactory;
}

export class WindowContext {
	public readonly windowId: number;
	public readonly window: BrowserWindow;
	public readonly container: ContainerInstance;
	public readonly eventBus: EventBus;
	private readonly logger: WindowContextLogger | undefined;

	constructor(config: WindowContextConfig) {
		this.window = config.window;
		this.windowId = config.window.id;
		this.container = Container.of(`window:${this.windowId}`);
		this.eventBus = config.eventBus;

		this.logger = config.globalContainer.has(LoggerService)
			? config.globalContainer.get(LoggerService)
			: undefined;
		this.logger?.info('WindowContext', `Creating context for window ${this.windowId}`);

		// Initialize window-scoped services using the factory
		const factory = config.serviceFactory || createDefaultWindowScopedServiceFactory();
		this.initializeServices(config.globalContainer, factory);

		this.eventBus.emit('window:created', {
			windowId: this.windowId,
			type: 'browser-window',
		});

		// Cleanup when window is closed
		this.window.on('closed', () => {
			this.eventBus.emit('window:closed', {
				windowId: this.windowId,
			});
			this.destroy();
		});
	}

	/**
	 * Initialize window-scoped services using the service factory.
	 * These services are isolated per window and don't affect other windows.
	 *
	 * The factory pattern allows new services to be added without modifying this method.
	 */
	private async initializeServices(
		globalContainer: ContainerInstance,
		serviceFactory: WindowScopedServiceFactory
	): Promise<void> {
		try {
			// Use factory to create and register remaining services
			await serviceFactory.createAndRegisterAll(this.container, {
				globalContainer,
				eventBus: this.eventBus,
			});

			this.logger?.info('WindowContext', `Initialized all services for window ${this.windowId}`);
		} catch (error) {
			this.logger?.error(
				'WindowContext',
				`Failed to initialize services for window ${this.windowId}`,
				error
			);
			throw error;
		}
	}

	/**
	 * Get a service from this window's container.
	 * Falls back to global container if not found in window scope.
	 */
	getService<T>(key: string, globalContainer: ContainerInstance): T {
		if (this.container.has(key)) {
			return this.container.get(key) as T;
		}
		return globalContainer.get(key) as T;
	}

	/**
	 * Cleanup window-scoped services when window is closed.
	 */
	async destroy(): Promise<void> {
		this.logger?.info('WindowContext', `Destroying context for window ${this.windowId}`);
		this.container.reset({ strategy: 'resetServices' });
	}
}

/**
 * WindowContextManager manages all window contexts.
 * Provides a centralized registry to look up contexts by window ID.
 */
export class WindowContextManager {
	private contexts = new Map<number, WindowContext>();

	constructor(
		private readonly globalContainer: ContainerInstance,
		private readonly eventBus: EventBus
	) {}

	/**
	 * Create a new window context for a BrowserWindow.
	 */
	create(window: BrowserWindow): WindowContext {
		const context = new WindowContext({
			window,
			globalContainer: this.globalContainer,
			eventBus: this.eventBus,
		});

		this.contexts.set(window.id, context);

		// Auto-cleanup when window is closed
		window.on('closed', () => {
			this.contexts.delete(window.id);
		});

		return context;
	}

	/**
	 * Get the context for a specific window ID.
	 * Throws if the context doesn't exist.
	 */
	get(windowId: number): WindowContext {
		const context = this.contexts.get(windowId);
		if (!context) {
			throw new Error(`No window context found for window ID ${windowId}`);
		}
		return context;
	}

	/**
	 * Get the context for a specific window ID, or undefined if not found.
	 */
	tryGet(windowId: number): WindowContext | undefined {
		return this.contexts.get(windowId);
	}

	/**
	 * Check if a context exists for a window ID.
	 */
	has(windowId: number): boolean {
		return this.contexts.has(windowId);
	}

	/**
	 * Destroy all window contexts.
	 */
	async destroyAll(): Promise<void> {
		const logger = this.globalContainer.get(LoggerService);
		logger?.info('WindowContextManager', `Destroying ${this.contexts.size} window contexts`);
		for (const context of this.contexts.values()) {
			await context.destroy();
		}
		this.contexts.clear();
	}
}
