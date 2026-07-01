import 'reflect-metadata';
import { Container, type ContainerInstance } from 'typedi';
import {
	EventBus,
	WindowFactory,
	AppState,
	WindowContextManager,
	AppPermissionsService,
} from './app';
import { LoggerService } from './shared';
import { Cron } from './agent/cron/cron';
import { Config } from './agent/core/config';
import { agentLocation } from './agent/shared/location';
import { ChannelRegistry, ChannelsService } from './channels';

import { Agent } from './agent/agent';
import { Skills } from './agent/skills/skills';
import { ProviderService } from './providers';
import { SttService } from './stt/service';

export interface BootstrapResult {
	container: ContainerInstance;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	windowContextManager: WindowContextManager;
}

export function bootstrapServices(): BootstrapResult {
	const container = Container.of('main');
	const appState = container.get(AppState);
	const eventBus = container.get(EventBus);

	const logger = new LoggerService(eventBus);
	container.set(LoggerService, logger);
	container.get(AppPermissionsService);

	const config = new Config({ location: agentLocation() });
	container.set(Config, config);
	const agentService = container.get(Agent);

	const channels = new ChannelsService(logger);
	container.set(ChannelsService, channels);
	const cron = new Cron(agentService.cron);
	container.set(Cron, cron);
	container.set(Skills, new Skills(config, agentService.skills));

	container.get(ProviderService);
	container.get(SttService);

	const channelRegistry = new ChannelRegistry({ logger, eventBus, agentService });
	container.set(ChannelRegistry, channelRegistry);
	void cron.start().catch((error) => {
		logger.error('Cron', 'Failed to start persistent cron scheduler', error);
	});

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
	};
}

export async function cleanup(container: ContainerInstance): Promise<void> {
	const logger = container.get(LoggerService);
	logger.info('Bootstrap', 'Starting cleanup');
	await container.get(WindowContextManager).destroyAll();
	container.get(ChannelRegistry).destroy();
	container.get(Cron).destroy();
	container.get(LoggerService).destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
