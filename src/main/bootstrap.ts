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
	cron: Cron;
	skills: Skills;
}

export function bootstrapServices(): BootstrapResult {
	const container = Container.of('main');
	const appState = container.get(AppState);
	const eventBus = container.get(EventBus);

	const logger = new LoggerService(eventBus);
	container.set(LoggerService, logger);
	container.get(AppPermissionsService);

	const agentService = new Agent();
	const config = agentService.config;
	container.set(Agent, agentService);

	const channels = new ChannelsService(logger);
	container.set(ChannelsService, channels);
	const cron = new Cron(agentService.cron);
	const skills = new Skills(config, agentService.skills);

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
		cron,
		skills,
	};
}

export async function cleanup(container: ContainerInstance, cron: Cron): Promise<void> {
	const logger = container.get(LoggerService);
	logger.info('Bootstrap', 'Starting cleanup');
	await container.get(WindowContextManager).destroyAll();
	container.get(ChannelRegistry).destroy();
	cron.destroy();
	container.get(LoggerService).destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
