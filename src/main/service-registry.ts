import type { AppsService } from './apps';
import type { ChannelRegistry } from './channels';
import type {
	AppState,
	EventBus,
	ServiceContainer,
	WindowFactory,
} from './core';
import type { WindowContextManager } from './core';
import type { AgentStartupFilesService } from './agent/startup-files';
import type { ConnectorsService } from './connectors';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { AgentService } from './service';
import type { SkillsService } from './skills';
import type { StoreService } from './store';
import type { UserDataDirectoryService } from './user-data';
import type { WorkspaceService } from './workspace';

export interface MainServices {
	appState: AppState;
	apps: AppsService;
	agentService: AgentService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	logger: LoggerService;
	mcpRegistry: McpRegistry;
	skills: SkillsService;
	startupFiles: AgentStartupFilesService;
	store: StoreService;
	userDataDirectory: UserDataDirectoryService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
