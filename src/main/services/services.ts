import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentV2Service } from '../agent_v2';
import type { AgentDataDirectoryService } from '../data-directory';
import type { AgentSettingsStore } from '../agent-settings';
import type { AppPermissionsService } from '../app/permissions';
import type { ConnectorsService } from '../connectors';
import type { CronService } from '../cron';
import type { HeartbeatService } from '../heartbeat';
import type { LlmService } from '../llm';
import type { LoggerService } from '../observability';
import type { SkillsService } from '../skills';
import type { SpeechToTextService } from '../stt';
import type { StoreService } from '../store';
import type { WorkspaceService } from '../workspace';
import type { AppState, EventBus, ServiceContainer, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentDataDirectory: AgentDataDirectoryService;
	agentSettings: AgentSettingsStore;
	agentService: AgentV2Service;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	heartbeat: HeartbeatService;
	llm: LlmService;
	logger: LoggerService;
	skills: SkillsService;
	speechToText: SpeechToTextService;
	store: StoreService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
