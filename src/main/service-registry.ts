import type { ChannelRegistry } from './channels';
import type { AppState, EventBus, ServiceContainer, WindowFactory } from './core';
import type { WindowContextManager } from './core';
import type { AgentService, AgentStartupFilesService } from './agent';
import type { AppPermissionsService } from './app-permissions';
import type { ConnectorsService } from './connectors';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { MonitorService } from './monitor';
import type { PolicyService } from './policy';
import type { PowerSaveBlockerService } from './power-save-blocker';
import type { SkillsService } from './skills';
import type { HeartbeatService } from './heartbeat';
import type { StoreService } from './store';
import type { TasksService } from './tasks';
import type { TextToSpeechService } from './tts';
import type { ToolService } from './tools';
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
	policy: PolicyService;
	powerSaveBlocker: PowerSaveBlockerService;
	skills: SkillsService;
	startupFiles: AgentStartupFilesService;
	store: StoreService;
	taskManager: TasksService;
	textToSpeech: TextToSpeechService;
	toolService: ToolService;
	userDataDirectory: UserDataDirectoryService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
