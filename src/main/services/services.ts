import type { ContainerInstance } from 'typedi';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentMcpService } from './agent-mcp-service';
import type { AgentService } from './agent-service';
import type { AppPermissionsService } from '../app/permissions';
import type { CronService } from '../cron';
import type { LlmService } from '../llm';
import type { LoggerService } from '../shared';
import type { ConnectorSettingsService } from './connector-settings-service';
import type { ProviderService } from './provider-service';
import type { SttService } from './stt-service';
import type { AppState, EventBus, WindowContextManager, WindowFactory } from './index';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentMcpService: AgentMcpService;
	agentService: AgentService;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	connectorSettingsService: ConnectorSettingsService;
	cron: CronService;
	eventBus: EventBus;
	llm: LlmService;
	logger: LoggerService;
	providerStore: ProviderService;
	stt: SttService;
	windowContextManager: WindowContextManager;
	windowFactory: WindowFactory;
}

export type MainServiceContainer = ContainerInstance;
