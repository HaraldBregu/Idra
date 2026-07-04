import {
	EventBus,
	WindowFactory,
	AppState,
	WindowContextManager,
} from './app';
import { LoggerService } from './shared';
import { ChannelRegistry, ChannelsService } from './channels';

import { Agent } from './agent/agent';
import { SttService } from './models/stt/service';

export interface MainServices {
	appState: AppState;
	eventBus: EventBus;
	logger: LoggerService;
	agentService: Agent;
	channels: ChannelsService;
	stt: SttService;
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
	const channels = new ChannelsService(logger);
	const stt = new SttService();
	const channelRegistry = new ChannelRegistry({ logger, eventBus, agentService });
	const windowFactory = new WindowFactory(logger);
	const windowContextManager = new WindowContextManager(logger, eventBus);

	logger.info('Bootstrap', 'Registered global services');

	return {
		appState,
		eventBus,
		logger,
		agentService,
		channels,
		stt,
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
