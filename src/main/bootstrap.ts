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
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';

import { McpService } from './mcp';
import { SkillsService } from './agent/skills';
import { LlmService } from './llm';
import { AgentService } from './agent/service';
import { HeartbeatService } from './heartbeat';
import { ProviderService } from './providers';
import { SttService } from './stt/service';
import { SystemService } from './agent/system';

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

	const channels = new ChannelsService(logger);
	container.set(ChannelsService, channels);
	const cron = container.get(CronService);

	container.get(ProviderService);
	container.get(McpService);
	container.get(SkillsService);
	container.get(LlmService);
	container.get(SttService);
	container.get(HeartbeatService);
	container.get(SystemService);

	const agentService = container.get(AgentService);

	const channelRegistry = new ChannelRegistry({ logger, eventBus, agentService });
	container.set(ChannelRegistry, channelRegistry);
	void cron.start().catch((error) => {
		logger.error('CronService', 'Failed to start persistent cron scheduler', error);
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
	container.get(CronService).destroy();
	container.get(HeartbeatService).destroy();
	container.get(LoggerService).destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
