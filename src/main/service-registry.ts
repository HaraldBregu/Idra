import type { AppsService } from './apps';
import type { ChannelRegistry } from './channels';
import type {
	AppState,
	EventBus,
	ServiceContainer,
	WindowFactory,
} from './core';
import type { WindowContextManager } from './core';
import type { ConnectorsService } from './connectors';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { AssistantService } from './service';
import type { StoreService } from './store';
import type { WorkspaceService } from './workspace';

export interface MainServices {
	appState: AppState;
	apps: AppsService;
	assistantService: AssistantService;
	channelRegistry: ChannelRegistry;
	connectors: ConnectorsService;
	cron: CronService;
	eventBus: EventBus;
	logger: LoggerService;
	mcpRegistry: McpRegistry;
	store: StoreService;
	windowContextManager: WindowContextManager<MainServices>;
	windowFactory: WindowFactory;
	workspace: WorkspaceService;
}

export type MainServiceContainer = ServiceContainer<MainServices>;
