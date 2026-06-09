import 'reflect-metadata';
import { Container } from 'typedi';
import { TypeDiServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './services';

import { AppPermissionsService } from './app/permissions';
import { LoggerService } from './observability';
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';

import { MainServiceTokens, type MainServiceContainer, type MainServices } from './services/services';
import { LlmService } from './llm';
import { AgentV2Service } from './services/agent-service';
import { ProviderStoreService } from './services/provider-store';

export interface BootstrapResult {
	container: MainServiceContainer;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	windowContextManager: WindowContextManager<MainServices>;
}

export function bootstrapServices(): BootstrapResult {
	const serviceContainer = Container.of('main');
	const container = new TypeDiServiceContainer<MainServices>(serviceContainer, MainServiceTokens);
	const appState = serviceContainer.get(AppState);
	const eventBus = serviceContainer.get(EventBus);

	container.register('appState', appState);
	container.register('eventBus', eventBus);

	const logger = new LoggerService(eventBus);
	container.register('logger', logger);
	container.register('appPermissions', serviceContainer.get(AppPermissionsService));

	container.register('channels', new ChannelsService(logger));
	const cron = container.register('cron', new CronService(logger));

	const providerStore = container.register('providerStore', new ProviderStoreService());
	container.register('llm', serviceContainer.get(LlmService));

	const agentService = container.register('agentService', new AgentV2Service(providerStore));

	container.register(
		'channelRegistry',
		new ChannelRegistry({ logger, eventBus, agentService })
	);
	void cron.start().catch((error) => {
		logger.error('CronService', 'Failed to start persistent cron scheduler', error);
	});

	const windowFactory = new WindowFactory(logger);
	container.register('windowFactory', windowFactory);

	const windowContextManager = new WindowContextManager(container, eventBus);
	container.register('windowContextManager', windowContextManager);

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
	const logger = container.get('logger');
	logger.info('Bootstrap', 'Starting cleanup');
	await container.shutdown();
	logger.info('Bootstrap', 'Cleanup complete');
}
