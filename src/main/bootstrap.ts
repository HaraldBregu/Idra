import { ServiceContainer, EventBus, WindowFactory, AppState, WindowContextManager } from './services';

import { AppPermissionsService } from './app/permissions';
import { LoggerService } from './observability';
import { StoreService } from './store';
import { CronService } from './cron';
import { ChannelRegistry, ChannelsService } from './channels';
import { AgentV2Service, type AgentV2ServiceDependencies } from './agent_v2';
import { AgentDataDirectoryService } from './data-directory';
import { AgentSettingsStore } from './agent-settings';
import { WorkspaceService } from './workspace';
import { ConnectorsService } from './connectors';
import { SkillsService } from './skills';
import { SpeechToTextService } from './stt';
import { DEFAULT_AGENT_ID } from './config';

import type { MainServiceContainer, MainServices } from './services/services';
import { HeartbeatService } from './heartbeat';
import { LlmService } from './llm';

export interface BootstrapResult {
	container: MainServiceContainer;
	eventBus: EventBus;
	windowFactory: WindowFactory;
	appState: AppState;
	logger: LoggerService;
	agentDataDirectory: AgentDataDirectoryService;
	workspace: WorkspaceService;
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

	const agentDataDirectory = container.register('agentDataDirectory', new AgentDataDirectoryService());
	void agentDataDirectory.ensureRoot().catch((error) => {
		logger.error('AgentDataDirectoryService', 'Failed to create agent data directory', error);
	});

	const skills = container.register(
		'skills',
		new SkillsService(logger)
	);

	const workspace = container.register(
		'workspace',
		new WorkspaceService(logger, {
			rootPath: agentDataDirectory.resolve(DEFAULT_AGENT_ID),
		})
	);
	const store = container.register('store', new StoreService());
	const agentSettings = container.register('agentSettings', new AgentSettingsStore({ logger }));
	const channels = container.register('channels', new ChannelsService(logger));
	const cron = container.register('cron', new CronService(logger, { store }));
	cron.restore((task) => {
		logger.info('CronService', `Tick (restored): ${task.id} '${task.expression}'`);
	});

	const connectors = container.register('connectors', new ConnectorsService(logger));
	const llm = container.register('llm', new LlmService());
	container.register('speechToText', new SpeechToTextService({ store, logger }));

	const agentDependencies: AgentV2ServiceDependencies = {
		store,
		cron,
			logger,
			eventBus,
			workspace,
			agentDataDirectory,
			agentSettings,
			llm,
		connectors,
		skills,
		channels,
	};
	const agentService = container.register(
		'agentService',
		new AgentV2Service(agentDependencies, {
			sessionBaseDir: agentDataDirectory.resolve('sessions'),
		})
	);
	const channelRegistry = container.register(
		'channelRegistry',
			new ChannelRegistry({ logger, eventBus, agentService })
	);
	agentDependencies.channelRegistry = channelRegistry;
	const heartbeat = container.register(
		'heartbeat',
		new HeartbeatService(agentService)
	);
	heartbeat.start();
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
		agentDataDirectory,
		workspace,
		windowContextManager,
	};
}

/**
 * Cleanup handler to be called on app quit.
 * Ensures all services are properly disposed.
 */
export async function cleanup(container: MainServiceContainer): Promise<void> {
	const logger = container.get('logger');
	logger.info('Bootstrap', 'Starting cleanup');
	await container.shutdown();
	logger.info('Bootstrap', 'Cleanup complete');
}
