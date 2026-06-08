import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentV2Service } from '../agent_usage/service';
import type { AgentStoreService } from '../agent_usage/store';
import type { AppPermissionsService } from '../app/permissions';
import type { ConnectorsService } from '../connectors';
import type { CronService } from '../cron';
import type { HeartbeatService } from '../heartbeat';
import type { LlmService } from '../llm';
import type { LoggerService } from '../observability';
import type { ModelSelectionStoreService } from './model/service';
import type { ProviderStoreService } from './provider/service';
import type { SkillsService } from '../skills';
import type { AgentStartupFilesService } from '../tools/startup/service';
import type { AppState, EventBus, ServiceContainer, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentV2Service;
	agentStore: AgentStoreService;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	heartbeat: HeartbeatService;
	eventBus: EventBus;
	llm: LlmService;
	logger: LoggerService;
	modelSelections: ModelSelectionStoreService;
	providerStore: ProviderStoreService;
	skills: SkillsService;
	startupFiles: AgentStartupFilesService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
