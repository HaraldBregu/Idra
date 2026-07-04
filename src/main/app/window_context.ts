import { BrowserWindow } from 'electron';
import type { EventBus } from './index';
import type { LoggerService } from '../shared';
import {
	createDefaultWindowScopedServiceFactory,
	type WindowScopedServiceFactory,
} from './window_scoped_service_factory';

export interface WindowContextConfig {
	window: BrowserWindow;
	logger?: LoggerService;
	eventBus: EventBus;
	serviceFactory?: WindowScopedServiceFactory;
}

export class WindowContext {
	public readonly windowId: number;
	public readonly window: BrowserWindow;
	public readonly services = new Map<string, unknown>();
	public readonly eventBus: EventBus;
	private readonly logger: LoggerService | undefined;

	constructor(config: WindowContextConfig) {
		this.window = config.window;
		this.windowId = config.window.id;
		this.eventBus = config.eventBus;
		this.logger = config.logger;

		this.logger?.info('WindowContext', `Creating context for window ${this.windowId}`);

		const factory = config.serviceFactory || createDefaultWindowScopedServiceFactory();
		this.initializeServices(factory);

		this.eventBus.emit('window:created', {
			windowId: this.windowId,
			type: 'browser-window',
		});

		this.window.on('closed', () => {
			this.eventBus.emit('window:closed', {
				windowId: this.windowId,
			});
			this.destroy();
		});
	}

	private async initializeServices(serviceFactory: WindowScopedServiceFactory): Promise<void> {
		try {
			await serviceFactory.createAndRegisterAll(this.services, {
				logger: this.logger,
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

	getService<T>(key: string, globalServices: Map<string, unknown>): T {
		if (this.services.has(key)) {
			return this.services.get(key) as T;
		}
		return globalServices.get(key) as T;
	}

	async destroy(): Promise<void> {
		this.logger?.info('WindowContext', `Destroying context for window ${this.windowId}`);
		this.services.clear();
	}
}

export class WindowContextManager {
	private contexts = new Map<number, WindowContext>();

	constructor(
		private readonly logger: LoggerService,
		private readonly eventBus: EventBus
	) {}

	create(window: BrowserWindow): WindowContext {
		const context = new WindowContext({
			window,
			logger: this.logger,
			eventBus: this.eventBus,
		});

		this.contexts.set(window.id, context);

		window.on('closed', () => {
			this.contexts.delete(window.id);
		});

		return context;
	}

	get(windowId: number): WindowContext {
		const context = this.contexts.get(windowId);
		if (!context) {
			throw new Error(`No window context found for window ID ${windowId}`);
		}
		return context;
	}

	tryGet(windowId: number): WindowContext | undefined {
		return this.contexts.get(windowId);
	}

	has(windowId: number): boolean {
		return this.contexts.has(windowId);
	}

	async destroyAll(): Promise<void> {
		this.logger.info('WindowContextManager', `Destroying ${this.contexts.size} window contexts`);
		for (const context of this.contexts.values()) {
			await context.destroy();
		}
		this.contexts.clear();
	}
}
