import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentService } from '../agent';
import type { AgentDataDirectoryService } from '../agent/storage';
import type { AgentSettingsStore } from '../agent/settings';
import type { ToolService } from '../agent/tools';
import type { AppPermissionsService } from '../app/permissions';
import type { UserDataDirectoryService } from '../app/user-data';
import type { ConnectorsService } from '../connectors';
import type { CronService } from '../cron';
import type { HeartbeatService } from '../heartbeat';
import type { LoggerService } from '../logger';
import type { SkillsService } from '../skills';
import type { SpeechToTextService } from '../stt';
import type { StoreService } from '../store';
import type { TasksService } from '../tasks';
import type { WorkspaceService } from '../workspace';
import type { AppState, EventBus, ServiceContainer, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentDataDirectory: AgentDataDirectoryService;
	agentSettings: AgentSettingsStore;
	agentService: AgentService;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	heartbeat: HeartbeatService;
	logger: LoggerService;
	skills: SkillsService;
	speechToText: SpeechToTextService;
	store: StoreService;
	taskManager: TasksService;
	toolService: ToolService;
	userDataDirectory: UserDataDirectoryService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
