export const WindowChannels = {
	minimize: 'window:minimize',
	maximize: 'window:maximize',
	close: 'window:close',
	isMaximized: 'window:is-maximized',
	isFullScreen: 'window:is-fullscreen',
	maximizeChange: 'window:maximize-change',
	fullScreenChange: 'window:fullscreen-change',
	popupMenu: 'window:popup-menu',
} as const;

export const AssistantChannels = {
	send: 'assistant:send',
	reset: 'assistant:reset',
	getHistory: 'assistant:get-history',
	response: 'assistant:response',
	resolveApproval: 'assistant:resolve-approval',
	resolveInput: 'assistant:resolve-input',
	cancel: 'assistant:cancel',
	getPending: 'assistant:get-pending',
	pending: 'assistant:pending',
} as const;

export const ProviderChannels = {
	setApiKey: 'provider:set-apikey',
	isApiKeySaved: 'provider:is-api-key-saved',
	getAll: 'provider:get-all',
	add: 'provider:add',
	getModels: 'provider:get-models',
	getAssistantService: 'provider:get-assistant-service',
	saveAssistantService: 'provider:save-assistant-service',
	getImageGenerationModels: 'provider:get-image-generation-models',
	getImageGenerationService: 'provider:get-image-generation-service',
	saveImageGenerationService: 'provider:save-image-generation-service',
} as const;

export const AppChannels = {
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	openAppDataFolder: 'app:open-app-data-folder',
	openUserDataFolder: 'app:open-user-data-folder',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
} as const;

export const CronChannels = {
	list: 'cron:list',
	add: 'cron:add',
	remove: 'cron:remove',
	createSchedule: 'cron:createSchedule',
	updateSchedule: 'cron:updateSchedule',
	pauseSchedule: 'cron:pauseSchedule',
	resumeSchedule: 'cron:resumeSchedule',
	deleteSchedule: 'cron:deleteSchedule',
	listSchedules: 'cron:listSchedules',
	getSchedule: 'cron:getSchedule',
	getScheduleEvents: 'cron:getScheduleEvents',
	getScheduleExecutions: 'cron:getScheduleExecutions',
	getNextRuns: 'cron:getNextRuns',
	runNow: 'cron:runNow',
	subscribe: 'cron:subscribe',
	unsubscribe: 'cron:unsubscribe',
	event: 'cron:event',
} as const;

export const AppsChannels = {
	list: 'apps:list',
	openFolder: 'apps:open-folder',
	delete: 'apps:delete',
	getRoot: 'apps:get-root',
} as const;

export const SkillsChannels = {
	list: 'skills:list',
	import: 'skills:import',
	delete: 'skills:delete',
	getRoot: 'skills:get-root',
} as const;

export const TaskChannels = {
	create: 'tasks:create',
	get: 'tasks:get',
	list: 'tasks:list',
	cancel: 'tasks:cancel',
	retry: 'tasks:retry',
	event: 'tasks:event',
} as const;

export const ConnectorsChannels = {
	catalog: 'connectors:catalog',
	list: 'connectors:list',
	add: 'connectors:add',
	update: 'connectors:update',
	remove: 'connectors:remove',
	enable: 'connectors:enable',
	disable: 'connectors:disable',
	test: 'connectors:test',
	reconnect: 'connectors:reconnect',
	refreshTools: 'connectors:refreshTools',
	listTools: 'connectors:listTools',
	callTool: 'connectors:callTool',
	get: 'connectors:get',
} as const;

export const ChannelsChannels = {
	getTelegramConfig: 'channels:telegram:get-config',
	saveTelegramConfig: 'channels:telegram:save-config',
	getTelegramStatus: 'channels:telegram:get-status',
	startTelegram: 'channels:telegram:start',
	stopTelegram: 'channels:telegram:stop',
	restartTelegram: 'channels:telegram:restart',
	statusChanged: 'channels:status-changed',
} as const;

interface AppInvokeChannelMap {
	[AppChannels.getLogs]: {
		args: [limit?: number];
		result: import('./app-log').AppLogEntry[];
	};
	[AppChannels.openLogsFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openAppDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openUserDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.setTrayEnabled]: {
		args: [enabled: boolean];
		result: void;
	};
	[AppChannels.getTrayEnabled]: {
		args: [];
		result: boolean;
	};
	[ProviderChannels.setApiKey]: {
		args: [providerId: string, apikey: string];
		result: void;
	};
	[ProviderChannels.isApiKeySaved]: {
		args: [providerId: string];
		result: boolean;
	};
	[ProviderChannels.getAll]: {
		args: [];
		result: import('./providers').PublicProvider[];
	};
	[ProviderChannels.add]: {
		args: [input: import('./providers').ProviderInput];
		result: import('./providers').PublicProvider;
	};
	[ProviderChannels.getModels]: {
		args: [provider: import('./providers').PublicProvider];
		result: import('./service').Model[];
	};
	[ProviderChannels.getAssistantService]: {
		args: [];
		result: import('./service').Assistant | undefined;
	};
	[ProviderChannels.saveAssistantService]: {
		args: [provider: import('./providers').PublicProvider, model: import('./service').Model];
		result: boolean;
	};
	[ProviderChannels.getImageGenerationModels]: {
		args: [provider: import('./providers').PublicProvider];
		result: import('./service').Model[];
	};
	[ProviderChannels.getImageGenerationService]: {
		args: [];
		result: import('./service').Assistant | undefined;
	};
	[ProviderChannels.saveImageGenerationService]: {
		args: [provider: import('./providers').PublicProvider, model: import('./service').Model];
		result: boolean;
	};
}

interface AssistantInvokeChannelMap {
	[AssistantChannels.send]: { args: [message: string]; result: string };
	[AssistantChannels.reset]: { args: []; result: void };
	[AssistantChannels.getHistory]: {
		args: [];
		result: import('./service').AssistantHistoryMessage[];
	};
	[AssistantChannels.resolveApproval]: {
		args: [id: string, decision: import('./service').ApprovalDecision | boolean];
		result: boolean;
	};
	[AssistantChannels.resolveInput]: {
		args: [id: string, answer: string];
		result: boolean;
	};
	[AssistantChannels.cancel]: { args: []; result: void };
	[AssistantChannels.getPending]: {
		args: [];
		result: import('./service').AssistantPendingState;
	};
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

interface CronInvokeChannelMap {
	[CronChannels.list]: { args: []; result: import('./cron').CronTaskView[] };
	[CronChannels.add]: {
		args: [
			expression: string,
			data: import('./cron').CronTaskData,
			options?: { id?: string; timezone?: string },
		];
		result: import('./cron').CronTask;
	};
	[CronChannels.remove]: { args: [id: string]; result: void };
	[CronChannels.createSchedule]: {
		args: [request: import('./cron').CronScheduleCreateRequest];
		result: import('./cron').CronSchedule;
	};
	[CronChannels.updateSchedule]: {
		args: [scheduleId: string, patch: import('./cron').CronScheduleUpdateRequest];
		result: import('./cron').CronSchedule;
	};
	[CronChannels.pauseSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.resumeSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.deleteSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.listSchedules]: {
		args: [filter?: import('./cron').CronScheduleFilter];
		result: import('./cron').CronSchedule[];
	};
	[CronChannels.getSchedule]: { args: [scheduleId: string]; result: import('./cron').CronSchedule };
	[CronChannels.getScheduleEvents]: {
		args: [scheduleId: string];
		result: import('./cron').CronScheduleEvent[];
	};
	[CronChannels.getScheduleExecutions]: {
		args: [scheduleId: string];
		result: import('./cron').CronExecutionRecord[];
	};
	[CronChannels.getNextRuns]: {
		args: [scheduleId: string, count: number];
		result: import('./cron').CronNextRunPreview;
	};
	[CronChannels.runNow]: {
		args: [scheduleId: string];
		result: import('./task').Task;
	};
}

interface AppsInvokeChannelMap {
	[AppsChannels.list]: { args: []; result: import('./apps').AppInfo[] };
	[AppsChannels.openFolder]: { args: [id: string]; result: void };
	[AppsChannels.delete]: { args: [id: string]; result: void };
	[AppsChannels.getRoot]: { args: []; result: string };
}

interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('./skills').SkillInfo[] };
	[SkillsChannels.import]: { args: []; result: import('./skills').SkillInfo | undefined };
	[SkillsChannels.delete]: { args: [id: string]; result: void };
	[SkillsChannels.getRoot]: { args: []; result: string };
}

interface TaskInvokeChannelMap {
	[TaskChannels.create]: {
		args: [request: import('./task').TaskCreateRequest];
		result: import('./task').Task;
	};
	[TaskChannels.get]: {
		args: [taskId: import('./task').TaskId];
		result: import('./task').Task;
	};
	[TaskChannels.list]: {
		args: [filter?: import('./task').TaskListFilter];
		result: import('./task').Task[];
	};
	[TaskChannels.cancel]: {
		args: [taskId: import('./task').TaskId, reason?: string];
		result: void;
	};
	[TaskChannels.retry]: {
		args: [taskId: import('./task').TaskId];
		result: void;
	};
}

interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.catalog]: {
		args: [];
		result: typeof import('./connectors').OPENAI_CONNECTOR_CATALOG;
	};
	[ConnectorsChannels.list]: { args: []; result: import('./connectors').ConnectorView[] };
	[ConnectorsChannels.get]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.add]: {
		args: [input: import('./connectors').ConnectorInput];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.update]: {
		args: [id: string, input: import('./connectors').ConnectorUpdateInput];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.remove]: { args: [id: string]; result: void };
	[ConnectorsChannels.enable]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.disable]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.test]: {
		args: [id: string];
		result: import('./connectors').ConnectorTestResult;
	};
	[ConnectorsChannels.reconnect]: {
		args: [id: string];
		result: import('./connectors').ConnectorTestResult;
	};
	[ConnectorsChannels.refreshTools]: {
		args: [id: string];
		result: import('./connectors').ConnectorTool[];
	};
	[ConnectorsChannels.listTools]: {
		args: [id: string];
		result: import('./connectors').ConnectorTool[];
	};
	[ConnectorsChannels.callTool]: {
		args: [
			id: string,
			name: string,
			args: unknown,
			options?: import('./connectors').ConnectorCallToolOptions,
		];
		result: unknown;
	};
}

interface ChannelsInvokeChannelMap {
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('./channels').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('./channels').TelegramChannelProperties];
		result: import('./channels').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AssistantInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		AppsInvokeChannelMap,
		SkillsInvokeChannelMap,
		TaskInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		ChannelsInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

interface AssistantEventChannelMap {
	[AssistantChannels.response]: { data: import('./service').AssistantResponseEvent };
	[AssistantChannels.pending]: { data: import('./service').AssistantPendingEventPayload };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels').ChannelStatusEvent };
}

interface TaskEventChannelMap {
	[TaskChannels.event]: { data: import('./task').TaskEvent };
}

interface CronEventChannelMap {
	[CronChannels.event]: { data: import('./cron').CronScheduleEvent };
}

export interface EventChannelMap
	extends AssistantEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		TaskEventChannelMap,
		CronEventChannelMap {}
