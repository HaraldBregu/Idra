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

export const AgentChannels = {
	send: 'agent:send',
	reset: 'agent:reset',
	getHistory: 'agent:get-history',
	response: 'agent:response',
	resolveApproval: 'agent:resolve-approval',
	resolveInput: 'agent:resolve-input',
	cancel: 'agent:cancel',
	getPending: 'agent:get-pending',
	listWorkspaceFiles: 'agent:list-workspace-files',
	readWorkspaceFile: 'agent:read-workspace-file',
	writeWorkspaceFile: 'agent:write-workspace-file',
	pending: 'agent:pending',
} as const;

export const ProviderChannels = {
	setApiKey: 'provider:set-apikey',
	isApiKeySaved: 'provider:is-api-key-saved',
	getAll: 'provider:get-all',
	add: 'provider:add',
	getModels: 'provider:get-models',
	getAgentService: 'provider:get-agent-service',
	saveAgentService: 'provider:save-agent-service',
	getSpeechTranscriberService: 'provider:get-speech-transcriber-service',
	saveSpeechTranscriberService: 'provider:save-speech-transcriber-service',
} as const;

export const RealtimeTranscriptionChannels = {
	start: 'realtime-transcription:start',
	appendAudio: 'realtime-transcription:append-audio',
	finish: 'realtime-transcription:finish',
	cancel: 'realtime-transcription:cancel',
	event: 'realtime-transcription:event',
} as const;

export const AppChannels = {
	setTheme: 'set-theme',
	themeChanged: 'change-theme',
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	openAppDataFolder: 'app:open-app-data-folder',
	openUserDataFolder: 'app:open-user-data-folder',
	openExternalUrl: 'app:open-external-url',
	sendTrayChatMessage: 'app:send-tray-chat-message',
	trayChatMessage: 'app:tray-chat-message',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	getKeepAwakeEnabled: 'app:get-keep-awake-enabled',
	setKeepAwakeEnabled: 'app:set-keep-awake-enabled',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
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
	action: 'cron:action',
	subscribe: 'cron:subscribe',
	unsubscribe: 'cron:unsubscribe',
	event: 'cron:event',
} as const;

export const HeartbeatChannels = {
	status: 'heartbeat:status',
	last: 'heartbeat:last',
	setEnabled: 'heartbeat:set-enabled',
	getTiming: 'heartbeat:get-timing',
	updateTiming: 'heartbeat:update-timing',
	systemEvent: 'heartbeat:system-event',
	request: 'heartbeat:request',
	event: 'heartbeat:event',
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
	connectOAuth: 'connectors:connectOAuth',
	get: 'connectors:get',
} as const;

export const ChannelsChannels = {
	listCatalog: 'channels:catalog',
	getConfig: 'channels:get-config',
	getChannelConfig: 'channels:get-channel-config',
	saveChannelConfig: 'channels:save-channel-config',
	getStatus: 'channels:get-status',
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
	[AppChannels.openExternalUrl]: {
		args: [url: string];
		result: void;
	};
	[AppChannels.sendTrayChatMessage]: {
		args: [message: string];
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
	[AppChannels.getKeepAwakeEnabled]: {
		args: [];
		result: boolean;
	};
	[AppChannels.setKeepAwakeEnabled]: {
		args: [enabled: boolean];
		result: boolean;
	};
	[AppChannels.getMicrophonePermission]: {
		args: [];
		result: import('./app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('./app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('./app-permissions').MicrophonePermissionSettings;
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
	[ProviderChannels.getAgentService]: {
		args: [];
		result: import('./service').Agent | undefined;
	};
	[ProviderChannels.saveAgentService]: {
		args: [provider: import('./providers').PublicProvider, model: import('./service').Model];
		result: boolean;
	};
	[ProviderChannels.getSpeechTranscriberService]: {
		args: [];
		result: import('./service').Agent | undefined;
	};
	[ProviderChannels.saveSpeechTranscriberService]: {
		args: [provider: import('./providers').PublicProvider, model: import('./service').Model];
		result: boolean;
	};
	[RealtimeTranscriptionChannels.start]: {
		args: [request?: import('./realtime-transcription').RealtimeTranscriptionStartRequest];
		result: import('./realtime-transcription').RealtimeTranscriptionSession;
	};
	[RealtimeTranscriptionChannels.finish]: {
		args: [sessionId: string];
		result: void;
	};
	[RealtimeTranscriptionChannels.cancel]: {
		args: [sessionId: string];
		result: void;
	};
}

interface AgentInvokeChannelMap {
	[AgentChannels.send]: { args: [message: string]; result: string };
	[AgentChannels.reset]: { args: []; result: void };
	[AgentChannels.getHistory]: {
		args: [];
		result: import('./service').AgentHistoryMessage[];
	};
	[AgentChannels.resolveApproval]: {
		args: [id: string, decision: import('./service').ApprovalDecision | boolean];
		result: boolean;
	};
	[AgentChannels.resolveInput]: {
		args: [id: string, answer: string];
		result: boolean;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.getPending]: {
		args: [];
		result: import('./service').AgentPendingState;
	};
	[AgentChannels.listWorkspaceFiles]: {
		args: [];
		result: import('./service').WorkspaceFileSummary[];
	};
	[AgentChannels.readWorkspaceFile]: {
		args: [name: string];
		result: import('./service').WorkspaceFileContent;
	};
	[AgentChannels.writeWorkspaceFile]: {
		args: [name: string, content: string];
		result: import('./service').WorkspaceFileContent;
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
		result: import('./cron').CronScheduledTask;
	};
	[CronChannels.action]: {
		args: [request: import('./cron').FridayCronToolRequest];
		result: import('./cron').FridayCronToolResponse;
	};
}

interface HeartbeatInvokeChannelMap {
	[HeartbeatChannels.status]: {
		args: [];
		result: import('./heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.last]: {
		args: [];
		result: import('./heartbeat').HeartbeatEventPayload | null;
	};
	[HeartbeatChannels.setEnabled]: {
		args: [request: import('./heartbeat').HeartbeatSetEnabledRequest];
		result: import('./heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.getTiming]: {
		args: [];
		result: import('./heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.updateTiming]: {
		args: [request: import('./heartbeat').HeartbeatTimingSettings];
		result: import('./heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.systemEvent]: {
		args: [request: import('./heartbeat').HeartbeatSystemEventRequest];
		result: import('./heartbeat').HeartbeatSystemEventResult;
	};
	[HeartbeatChannels.request]: {
		args: [request: import('./heartbeat').HeartbeatWakeRequest];
		result: void;
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
	[ConnectorsChannels.connectOAuth]: {
		args: [id: string];
		result: import('./connectors').ConnectorOAuthConnectResult;
	};
}

interface ChannelsInvokeChannelMap {
	[ChannelsChannels.listCatalog]: {
		args: [];
		result: import('./channel-catalog').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('./channels').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('./channels').ChannelType];
		result: import('./channels').Channel[import('./channels').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('./channels').ChannelType,
			config: import('./channels').Channel[import('./channels').ChannelType],
		];
		result: import('./channels').Channel[import('./channels').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('./channels').ChannelType];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
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
		AgentInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		AppsInvokeChannelMap,
		SkillsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		ChannelsInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
	[AppChannels.setTheme]: { args: [theme: import('./theme').ThemeMode] };
	[RealtimeTranscriptionChannels.appendAudio]: {
		args: [sessionId: string, audio: string];
	};
}

interface AppEventChannelMap {
	[AppChannels.themeChanged]: { data: import('./theme').ThemeMode };
	[AppChannels.trayChatMessage]: { data: string };
	[RealtimeTranscriptionChannels.event]: {
		data: import('./realtime-transcription').RealtimeTranscriptionEvent;
	};
}

interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('./service').AgentResponseEvent };
	[AgentChannels.pending]: { data: import('./service').AgentPendingEventPayload };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels').ChannelStatusEvent };
}

interface CronEventChannelMap {
	[CronChannels.event]: { data: import('./cron').CronScheduleEvent };
}

interface HeartbeatEventChannelMap {
	[HeartbeatChannels.event]: { data: import('./heartbeat').HeartbeatEventPayload };
}

export interface EventChannelMap
	extends AppEventChannelMap,
		AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap {}
