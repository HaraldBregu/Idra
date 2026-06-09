import type { ContainerInstance } from 'typedi';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentV2Service } from './agent-service';
import type { AppPermissionsService } from '../app/permissions';
import type { CronService } from '../cron';
import type { LlmService } from '../llm';
import type { LoggerService } from '../observability';
import type { ProviderStoreService } from './provider-store';
import type { AppState, EventBus, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentV2Service;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	cron: CronService;
	eventBus: EventBus;
	llm: LlmService;
	logger: LoggerService;
	providerStore: ProviderStoreService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
}

export type MainServiceContainer = ContainerInstance;
