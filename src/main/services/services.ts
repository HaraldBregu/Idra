import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentV2Service } from '../agent_usage/service';
import type { AppPermissionsService } from '../app/permissions';
import type { ConnectorsService } from '../connectors';
import type { CronService } from '../cron';
import type { HeartbeatService } from '../heartbeat';
import type { LlmService } from '../llm';
import type { LoggerService } from '../observability';
import type { SkillsService } from '../skills';
import type { AgentStartupFilesService } from '../tools/startup/service';
import type { AppState, EventBus, ServiceContainer, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentV2Service;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	llm: LlmService;
	logger: LoggerService;
	skills: SkillsService;
	startupFiles: AgentStartupFilesService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
