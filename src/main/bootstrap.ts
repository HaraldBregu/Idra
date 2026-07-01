import 'reflect-metadata';
import { Container, type ContainerInstance } from 'typedi';
import {
	EventBus,
	WindowFactory,
	AppState,
	WindowContextManager,
} from './app';
import { LoggerService } from './shared';
import { ChannelRegistry, ChannelsService } from './channels';

import { Agent } from './agent/agent';
import { PROVIDER_SERVICE, createProviderService } from './providers';
import { SttService } from './stt/service';

export interface BootstrapResult {
	container: ContainerInstance;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	windowContextManager: WindowContextManager;
	agentService: Agent;
}

export function bootstrapServices(): BootstrapResult {
	const container = Container.of('main');
	const appState = container.get(AppState);
	const eventBus = container.get(EventBus);

	const logger = new LoggerService(eventBus);
	container.set(LoggerService, logger);

	const agentService = new Agent();
	container.set(Agent, agentService);

	const channels = new ChannelsService(logger);
	container.set(ChannelsService, channels);

	container.get(ProviderService);
	container.get(SttService);

	const channelRegistry = new ChannelRegistry({ logger, eventBus, agentService });
	container.set(ChannelRegistry, channelRegistry);

	const windowFactory = new WindowFactory(logger);
	container.set(WindowFactory, windowFactory);

	const windowContextManager = new WindowContextManager(container, eventBus);
	container.set(WindowContextManager, windowContextManager);

	logger.info('Bootstrap', 'Registered global services');

	return {
		container,
		eventBus,
		windowFactory,
		appState,
		logger,
		windowContextManager,
		agentService,
	};
}

export async function cleanup(container: ContainerInstance): Promise<void> {
	const logger = container.get(LoggerService);
	logger.info('Bootstrap', 'Starting cleanup');
	await container.get(WindowContextManager).destroyAll();
	container.get(ChannelRegistry).destroy();
	container.get(LoggerService).destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
