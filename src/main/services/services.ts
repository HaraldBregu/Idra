import { Token } from 'typedi';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentV2Service } from './agent-service';
import type { AppPermissionsService } from '../app/permissions';
import type { CronService } from '../cron';
import type { LlmService } from '../llm';
import type { LoggerService } from '../observability';
import type { ProviderStoreService } from './provider-store';
import type { AppState, EventBus, WindowContextManager, WindowFactory } from './index';
import type { ServiceTokenMap, TypeDiServiceContainer } from './di-container';

export interface MainServices {
	appState: AppState;
	appPermissions: AppPermissionsService;
	agentService: AgentV2Service;
	channels: ChannelsService;
	channelRegistry: ChannelRegistry;
	cron: CronService;
	eventBus: EventBus;
	llm: LlmService;
	logger: LoggerService;
	providerStore: ProviderStoreService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
}

export const MainServiceTokens = {
	appState: new Token<AppState>('appState'),
	appPermissions: new Token<AppPermissionsService>('appPermissions'),
	agentService: new Token<AgentV2Service>('agentService'),
	channels: new Token<ChannelsService>('channels'),
	channelRegistry: new Token<ChannelRegistry>('channelRegistry'),
	cron: new Token<CronService>('cron'),
	eventBus: new Token<EventBus>('eventBus'),
	llm: new Token<LlmService>('llm'),
	logger: new Token<LoggerService>('logger'),
	providerStore: new Token<ProviderStoreService>('providerStore'),
	windowContextManager: new Token<WindowContextManager<MainServices>>('windowContextManager'),
	windowFactory: new Token<WindowFactory>('windowFactory'),
} satisfies ServiceTokenMap<MainServices>;

export type MainServiceContainer = TypeDiServiceContainer<MainServices>;
