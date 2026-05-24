import type { ChannelRegistry } from './channels';
import type { AppState, EventBus, ServiceContainer, WindowFactory } from './core';
import type { WindowContextManager } from './core';
import type { AgentStartupFilesService } from './agent/startup-files';
import type { AppPermissionsService } from './app-permissions';
import type { ConnectorsService } from './connectors';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { MonitorService } from './monitor';
import type { PowerSaveBlockerService } from './power-save-blocker';
import type { HeartbeatService } from './heartbeat';
import type { AgentService } from './service';
import type { SkillsService } from './skills';
import type { StoreService } from './store';
import type { TaskManager } from './tasks';
import type { UserDataDirectoryService } from './user-data';
import type { WorkspaceService } from './workspace';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	heartbeat: HeartbeatService;
	logger: LoggerService;
	mcpRegistry: McpRegistry;
	monitor: MonitorService;
	powerSaveBlocker: PowerSaveBlockerService;
	skills: SkillsService;
	startupFiles: AgentStartupFilesService;
	store: StoreService;
	taskManager: TaskManager;
	userDataDirectory: UserDataDirectoryService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
