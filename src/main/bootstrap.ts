import { chmod, mkdir } from 'node:fs/promises';
import { ServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './services';

import { AppPermissionsService } from './app/permissions';
import { LoggerService } from './observability';
import { StoreService } from './store';
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';
import { AgentV2Service } from './agent_v2';
import { ConnectorsService } from './connectors';
import { SkillsService } from './skills';
import { SpeechToTextService } from './stt';
import { AgentStartupFilesService } from './tools/startup/service';
import { resolveAgentDataPath } from './tools/startup/path';

import type { MainServiceContainer, MainServices } from './services/services';
import { LlmService } from './llm';

export interface BootstrapResult {
	container: MainServiceContainer;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	windowContextManager: WindowContextManager<MainServices>;
}

export function bootstrapServices(): BootstrapResult {
	const appState = new AppState();
	const container = new ServiceContainer<MainServices>();
	const eventBus = new EventBus();

	container.register('appState', appState);
	container.register('eventBus', eventBus);

	const logger = new LoggerService(eventBus);
	container.register('logger', logger);
	container.register('appPermissions', new AppPermissionsService());

	const agentRoot = resolveAgentDataPath();
	void mkdir(agentRoot, { recursive: true, mode: 0o700 })
		.then(async () => {
			if (process.platform !== 'win32') await chmod(agentRoot, 0o700).catch(() => undefined);
		})
		.catch((error) => {
			logger.error('AgentDataPath', 'Failed to create agent data directory', error);
		});

	container.register(
		'skills',
		new SkillsService(logger)
	);

	const store = container.register('store', new StoreService());
	container.register('channels', new ChannelsService(logger));
	const cron = container.register('cron', new CronService(logger, { store }));
	cron.restore((task) => {
		logger.info('CronService', `Tick (restored): ${task.id} '${task.expression}'`);
	});

	container.register('connectors', new ConnectorsService(logger));
	container.register('llm', new LlmService());
	container.register('speechToText', new SpeechToTextService({ store, logger }));
	container.register(
		'startupFiles',
		new AgentStartupFilesService({ rootPath: agentRoot, logger })
	);

	const agentService = container.register(
		'agentService',
		new AgentV2Service(new Settings())
	);
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

	logger.info('Bootstrap', `Registered ${container.has('store') ? 'all' : 'some'} global services`);

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
