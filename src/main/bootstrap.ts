import { AppState } from './app_state';
import { EventBus } from './event_bus';
import { WindowContextManager } from './window_context';
import { WindowFactory } from './window_factory';
import { LoggerService } from './shared';
import { createChannelRegistry, type ChannelRegistry } from './channels';
import { ExtensionRegistry, ExtensionStorage } from './extensions/extension_index';

import { Agent } from './agent/agent';
import { ExecSandbox } from './agent/sandbox';
import { createRealtimeVoiceManager, type RealtimeVoiceManager } from './realtime_voice';

export interface MainServices {
	appState: AppState;
	eventBus: EventBus;
	logger: LoggerService;
	agentService: Agent;
	channelRegistry: ChannelRegistry;
	windowFactory: WindowFactory;
	windowContextManager: WindowContextManager;
	extensionRegistry: ExtensionRegistry;
	extensionStorage: ExtensionStorage;
	realtimeVoiceManager: RealtimeVoiceManager;
}

export interface BootstrapResult extends MainServices {}

export function bootstrapServices(): BootstrapResult {
	const appState = new AppState();
	const eventBus = new EventBus();
	const logger = new LoggerService(eventBus);
	const extensionRegistry = new ExtensionRegistry();
	const extensionStorage = new ExtensionStorage();
	const windowFactory = new WindowFactory(logger, extensionRegistry);
	const agentService = new Agent(windowFactory, new ExecSandbox());
	const channelRegistry = createChannelRegistry({ logger, eventBus, agentService });
	const windowContextManager = new WindowContextManager(logger, eventBus);
	const realtimeVoiceManager = createRealtimeVoiceManager(agentService, windowFactory, eventBus);

	logger.info('Bootstrap', 'Registered global services');

	return {
		appState,
		eventBus,
		logger,
		agentService,
		channelRegistry,
		windowFactory,
		windowContextManager,
		extensionRegistry,
		extensionStorage,
		realtimeVoiceManager,
	};
}

export async function cleanup(services: MainServices): Promise<void> {
	const { logger, windowContextManager, channelRegistry, realtimeVoiceManager } = services;
	logger.info('Bootstrap', 'Starting cleanup');
	await realtimeVoiceManager.stopAll();
	await windowContextManager.destroyAll();
	channelRegistry.destroy();
	logger.destroy();
	logger.info('Bootstrap', 'Cleanup complete');
}
