import { AppState } from './app_state';
import { EventBus } from './event_bus';
import { WindowContextManager } from './window_context';
import { WindowFactory } from './window_factory';
import { LoggerService } from './shared';
import { createChannelRegistry, type ChannelRegistry } from './channels';

import { Agent } from './agent/agent';

export interface MainServices {
	appState: AppState;
	eventBus: EventBus;
	logger: LoggerService;
	agentService: Agent;
	channelRegistry: ChannelRegistry;
	windowFactory: WindowFactory;
	windowContextManager: WindowContextManager;
}

export interface BootstrapResult extends MainServices {}

export function bootstrapServices(): BootstrapResult {
	const appState = new AppState();
	const eventBus = new EventBus();
	const logger = new LoggerService(eventBus);
	const agentService = new Agent();
	const channelRegistry = createChannelRegistry({ logger, eventBus, agentService });
	const windowFactory = new WindowFactory(logger);
	const windowContextManager = new WindowContextManager(logger, eventBus);

	logger.info('Bootstrap', 'Registered global services');

	return {
		appState,
		eventBus,
		logger,
		agentService,
		channelRegistry,
		windowFactory,
		windowContextManager,
	};
}

export async function cleanup(services: MainServices): Promise<void> {
	const { logger, windowContextManager, channelRegistry } = services;
	logger.info('Bootstrap', 'Starting cleanup');
	await windowContextManager.destroyAll();
	channelRegistry.destroy();
	logger.destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
