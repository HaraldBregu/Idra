import type { ContainerInstance } from 'typedi';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentService } from './agent/service';
import type { AppPermissionsService } from '../permissions';
import type { McpService } from '../mcp';
import type { CronService } from './cron';
import type { HeartbeatService } from './heartbeat';
import type { LlmService } from '../llm';
import type { LoggerService } from '../shared';
import type { ProviderService } from './provider-service';
import type { SttService } from './stt-service';
import type { AppState, EventBus, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentService;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectorSettingsService: Connector;
	cron: CronService;
	eventBus: EventBus;
	heartbeat: HeartbeatService;
	llm: LlmService;
	logger: LoggerService;
	providerStore: ProviderService;
	stt: SttService;
	windowContextManager: WindowContextManager;
	windowFactory: WindowFactory;
}

export type MainServiceContainer = ContainerInstance;
