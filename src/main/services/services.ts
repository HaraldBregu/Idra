import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentService } from '../agent';
import type { AgentDataDirectoryService } from '../agent/storage';
import type { AgentSettingsStore } from '../agent/settings';
import type { ToolService } from '../capabilities/tools';
import type { AppPermissionsService } from '../app/permissions';
import type { UserDataDirectoryService } from '../storage/user-data';
import type { ConnectorsService } from '../capabilities/connectors';
import type { CronService } from '../cron';
import type { HeartbeatService } from '../heartbeat';
import type { LoggerService } from '../observability';
import type { SkillsService } from '../capabilities/skills';
import type { SpeechToTextService } from '../stt';
import type { StoreService } from '../storage';
import type { WorkspaceService } from '../modules/workspace';
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
	toolService: ToolService;
	userDataDirectory: UserDataDirectoryService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
