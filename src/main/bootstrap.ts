import 'reflect-metadata';
import { Container } from 'typedi';
import { EventBus, WindowFactory, AppState, WindowContextManager } from './services';

import { AppPermissionsService } from './permissions';
import { LoggerService } from './shared';
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';

import type { MainServiceContainer } from './services/services';
import { Connector } from './connectors';
import { LlmService } from './llm';
import { AgentService } from './agent/service';
import { ProviderService } from './services/provider-service';
import { SttService } from './services/stt-service';

export interface BootstrapResult {
	container: MainServiceContainer;
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
	container.get(Connector);
	container.get(LlmService);
	container.get(SttService);

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

export async function cleanup(container: MainServiceContainer): Promise<void> {
	const logger = container.get(LoggerService);
	logger.info('Bootstrap', 'Starting cleanup');
	await container.get(WindowContextManager).destroyAll();
	container.get(ChannelRegistry).destroy();
	container.get(CronService).destroy();
	container.get(LoggerService).destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
