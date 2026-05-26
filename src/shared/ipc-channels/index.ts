import type { AgentSendRuntimeOptions } from '../agents/service';

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
	openHistoryFolder: 'agent:open-history-folder',
	response: 'agent:response',
	cancel: 'agent:cancel',
	listStartupFiles: 'agent:list-startup-files',
	readStartupFile: 'agent:read-startup-file',
	writeStartupFile: 'agent:write-startup-file',
	listWorkspaceFiles: 'agent:list-workspace-files',
	readWorkspaceFile: 'agent:read-workspace-file',
	writeWorkspaceFile: 'agent:write-workspace-file',
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

export const OperatorChannels = {
	getAssistant: 'operator:get-assistant',
	saveAssistant: 'operator:save-assistant',
	getSpeechToText: 'operator:get-speech-to-text',
	getSpeechToTextModels: 'operator:get-speech-to-text-models',
	saveSpeechToText: 'operator:save-speech-to-text',
	getTextToSpeech: 'operator:get-text-to-speech',
	getTextToSpeechModels: 'operator:get-text-to-speech-models',
	saveTextToSpeech: 'operator:save-text-to-speech',
	getImageCreator: 'operator:get-image-creator',
	getImageCreatorModels: 'operator:get-image-creator-models',
	saveImageCreator: 'operator:save-image-creator',
	getTextToVideo: 'operator:get-text-to-video',
	getTextToVideoModels: 'operator:get-text-to-video-models',
	saveTextToVideo: 'operator:save-text-to-video',
	getMusicCreator: 'operator:get-music-creator',
	getMusicCreatorModels: 'operator:get-music-creator-models',
	saveMusicCreator: 'operator:save-music-creator',
} as const;

export const RealtimeTranscriptionChannels = {
	start: 'realtime-transcription:start',
	appendAudio: 'realtime-transcription:append-audio',
	finish: 'realtime-transcription:finish',
	cancel: 'realtime-transcription:cancel',
	event: 'realtime-transcription:event',
} as const;

export const SpeechToTextChannels = {
	transcribe: 'speech-to-text:transcribe',
	startDictation: 'speech-to-text:start-dictation',
	appendAudio: 'speech-to-text:append-audio',
	finishDictation: 'speech-to-text:finish-dictation',
	cancelDictation: 'speech-to-text:cancel-dictation',
	event: 'speech-to-text:event',
} as const;

export const TaskChannels = {
	start: 'tasks:start',
	list: 'tasks:list',
	get: 'tasks:get',
	cancel: 'tasks:cancel',
	event: 'tasks:event',
} as const;

export const AppChannels = {
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	openAppDataFolder: 'app:open-app-data-folder',
	openUserDataFolder: 'app:open-user-data-folder',
	openExternalUrl: 'app:open-external-url',
	openSystemPreference: 'app:open-system-preference',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	getKeepAwakeEnabled: 'app:get-keep-awake-enabled',
	setKeepAwakeEnabled: 'app:set-keep-awake-enabled',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
	getCameraPermission: 'app:get-camera-permission',
	setCameraEnabled: 'app:set-camera-enabled',
	requestCameraPermission: 'app:request-camera-permission',
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

export const HeartbeatChannels = {
	status: 'heartbeat:status',
	last: 'heartbeat:last',
	settings: 'heartbeat:settings',
	saveSettings: 'heartbeat:save-settings',
	setEnabled: 'heartbeat:set-enabled',
	getTiming: 'heartbeat:get-timing',
	updateTiming: 'heartbeat:update-timing',
	setProviderId: 'heartbeat:set-provider-id',
	setModelId: 'heartbeat:set-model-id',
	setReasoningEffort: 'heartbeat:set-reasoning-effort',
	systemEvent: 'heartbeat:system-event',
	request: 'heartbeat:request',
	event: 'heartbeat:event',
} as const;

export const MonitorChannels = {
	snapshot: 'monitor:snapshot',
	list: 'monitor:list',
	get: 'monitor:get',
	event: 'monitor:event',
} as const;

export const SkillsChannels = {
	list: 'skills:list',
	load: 'skills:load',
	import: 'skills:import',
	download: 'skills:download',
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

export const StoreChannels = {
	getProviders: 'store:get-providers',
	setProviderApiKey: 'store:set-provider-api-key',
	isProviderApiKeySaved: 'store:is-provider-api-key-saved',
	addProvider: 'store:add-provider',
	getKeepAwakeEnabled: 'store:get-keep-awake-enabled',
	setKeepAwakeEnabled: 'store:set-keep-awake-enabled',
	getAssistantSettings: 'store:get-assistant-settings',
	getSpeechToTextSettings: 'store:get-speech-to-text-settings',
	getTextToSpeechSettings: 'store:get-text-to-speech-settings',
	getImageCreatorSettings: 'store:get-image-creator-settings',
	getTextToVideoSettings: 'store:get-text-to-video-settings',
	getTextToSoundSettings: 'store:get-text-to-sound-settings',
	getCronSettings: 'store:get-cron-settings',
	getTaskSettings: 'store:get-task-settings',
	getAgentRoutingSettings: 'store:get-agent-routing-settings',
	getConnectorSettings: 'store:get-connector-settings',
	getAssistantOperator: 'store:get-assistant-operator',
	saveAssistantOperator: 'store:save-assistant-operator',
	getSpeechToTextOperator: 'store:get-speech-to-text-operator',
	saveSpeechToTextOperator: 'store:save-speech-to-text-operator',
	getTextToSpeechOperator: 'store:get-text-to-speech-operator',
	saveTextToSpeechOperator: 'store:save-text-to-speech-operator',
	getImageCreatorOperator: 'store:get-image-creator-operator',
	saveImageCreatorOperator: 'store:save-image-creator-operator',
	getTextToVideoOperator: 'store:get-text-to-video-operator',
	saveTextToVideoOperator: 'store:save-text-to-video-operator',
	getMusicCreatorOperator: 'store:get-music-creator-operator',
	saveMusicCreatorOperator: 'store:save-music-creator-operator',
	getAgentService: 'store:get-agent-service',
	saveAgentService: 'store:save-agent-service',
	getSpeechTranscriberService: 'store:get-speech-transcriber-service',
	saveSpeechTranscriberService: 'store:save-speech-transcriber-service',
} as const;

export const PolicyChannels = {
	get: 'policy:get',
	set: 'policy:set',
} as const;

interface AppInvokeChannelMap {
	[AppChannels.getLogs]: {
		args: [limit?: number];
		result: import('../app-log').AppLogEntry[];
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
		result: import('../app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('../app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('../app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.openSystemPreference]: {
		args: [pane: import('../app-permissions').SystemPreferencePaneId];
		result: void;
	};
	[AppChannels.getCameraPermission]: {
		args: [];
		result: import('../app-permissions').CameraPermissionSettings;
	};
	[AppChannels.setCameraEnabled]: {
		args: [enabled: boolean];
		result: import('../app-permissions').CameraPermissionSettings;
	};
	[AppChannels.requestCameraPermission]: {
		args: [];
		result: import('../app-permissions').CameraPermissionSettings;
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
		result: import('../providers').PublicProvider[];
	};
	[ProviderChannels.add]: {
		args: [input: import('../providers').ProviderInput];
		result: import('../providers').PublicProvider;
	};
	[ProviderChannels.getModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getAgentService]: {
		args: [];
		result: import('../agents/service').Agent | undefined;
	};
	[ProviderChannels.saveAgentService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[ProviderChannels.getSpeechTranscriberService]: {
		args: [];
		result: import('../agents/service').Agent | undefined;
	};
	[ProviderChannels.saveSpeechTranscriberService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getAssistant]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.saveAssistant]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getSpeechToText]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.getSpeechToTextModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[OperatorChannels.saveSpeechToText]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getTextToSpeech]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.getTextToSpeechModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[OperatorChannels.saveTextToSpeech]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getImageCreator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.getImageCreatorModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[OperatorChannels.saveImageCreator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getTextToVideo]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.getTextToVideoModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[OperatorChannels.saveTextToVideo]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[OperatorChannels.getMusicCreator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[OperatorChannels.getMusicCreatorModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[OperatorChannels.saveMusicCreator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[RealtimeTranscriptionChannels.start]: {
		args: [request?: import('../realtime-transcription').RealtimeTranscriptionStartRequest];
		result: import('../realtime-transcription').RealtimeTranscriptionSession;
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

interface SpeechToTextInvokeChannelMap {
	[SpeechToTextChannels.transcribe]: {
		args: [request: import('../speech-to-text').SpeechToTextTranscribeRequest];
		result: import('../speech-to-text').SpeechToTextTranscription;
	};
	[SpeechToTextChannels.startDictation]: {
		args: [request?: import('../speech-to-text').SpeechToTextDictationStartRequest];
		result: import('../speech-to-text').SpeechToTextDictationSession;
	};
	[SpeechToTextChannels.finishDictation]: {
		args: [sessionId: string];
		result: void;
	};
	[SpeechToTextChannels.cancelDictation]: {
		args: [sessionId: string];
		result: void;
	};
}

interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: AgentSendRuntimeOptions];
		result: string;
	};
	[AgentChannels.reset]: { args: []; result: void };
	[AgentChannels.getHistory]: {
		args: [];
		result: import('../agents/service').AgentHistoryMessage[];
	};
	[AgentChannels.openHistoryFolder]: {
		args: [];
		result: void;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.listStartupFiles]: {
		args: [];
		result: import('../agents/service').AgentStartupFileSummary[];
	};
	[AgentChannels.readStartupFile]: {
		args: [name: string];
		result: import('../agents/service').AgentStartupFileContent;
	};
	[AgentChannels.writeStartupFile]: {
		args: [name: string, content: string];
		result: import('../agents/service').AgentStartupFileContent;
	};
	[AgentChannels.listWorkspaceFiles]: {
		args: [];
		result: import('../agents/service').WorkspaceFileSummary[];
	};
	[AgentChannels.readWorkspaceFile]: {
		args: [name: string];
		result: import('../agents/service').WorkspaceFileContent;
	};
	[AgentChannels.writeWorkspaceFile]: {
		args: [name: string, content: string];
		result: import('../agents/service').WorkspaceFileContent;
	};
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

interface CronInvokeChannelMap {
	[CronChannels.list]: { args: []; result: import('../cron').CronTaskView[] };
	[CronChannels.add]: {
		args: [
			expression: string,
			data: import('../cron').CronTaskData,
			options?: { id?: string; timezone?: string },
		];
		result: import('../cron').CronTask;
	};
	[CronChannels.remove]: { args: [id: string]; result: void };
	[CronChannels.createSchedule]: {
		args: [request: import('../cron').CronScheduleCreateRequest];
		result: import('../cron').CronSchedule;
	};
	[CronChannels.updateSchedule]: {
		args: [scheduleId: string, patch: import('../cron').CronScheduleUpdateRequest];
		result: import('../cron').CronSchedule;
	};
	[CronChannels.pauseSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.resumeSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.deleteSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.listSchedules]: {
		args: [filter?: import('../cron').CronScheduleFilter];
		result: import('../cron').CronSchedule[];
	};
	[CronChannels.getSchedule]: {
		args: [scheduleId: string];
		result: import('../cron').CronSchedule;
	};
	[CronChannels.getScheduleEvents]: {
		args: [scheduleId: string];
		result: import('../cron').CronScheduleEvent[];
	};
	[CronChannels.getScheduleExecutions]: {
		args: [scheduleId: string];
		result: import('../cron').CronExecutionRecord[];
	};
	[CronChannels.getNextRuns]: {
		args: [scheduleId: string, count: number];
		result: import('../cron').CronNextRunPreview;
	};
	[CronChannels.runNow]: {
		args: [scheduleId: string];
		result: import('../cron').CronScheduledTask;
	};
}

interface HeartbeatInvokeChannelMap {
	[HeartbeatChannels.status]: {
		args: [];
		result: import('../heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.last]: {
		args: [];
		result: import('../heartbeat').HeartbeatEventPayload | null;
	};
	[HeartbeatChannels.settings]: {
		args: [];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.saveSettings]: {
		args: [request: import('../heartbeat').HeartbeatSettingsUpdate];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setEnabled]: {
		args: [request: import('../heartbeat').HeartbeatSetEnabledRequest];
		result: import('../heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.getTiming]: {
		args: [];
		result: import('../heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.updateTiming]: {
		args: [request: import('../heartbeat').HeartbeatTimingSettings];
		result: import('../heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.setProviderId]: {
		args: [request: import('../heartbeat').HeartbeatSetProviderRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setModelId]: {
		args: [request: import('../heartbeat').HeartbeatSetModelRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setReasoningEffort]: {
		args: [request: import('../heartbeat').HeartbeatSetReasoningEffortRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.systemEvent]: {
		args: [request: import('../heartbeat').HeartbeatSystemEventRequest];
		result: import('../heartbeat').HeartbeatSystemEventResult;
	};
	[HeartbeatChannels.request]: {
		args: [request: import('../heartbeat').HeartbeatWakeRequest];
		result: void;
	};
}

interface TaskInvokeChannelMap {
	[TaskChannels.start]: {
		args: [request: import('../tasks').TaskRunRequest];
		result: import('../tasks').TaskRecord;
	};
	[TaskChannels.list]: {
		args: [];
		result: import('../tasks').TaskRecord[];
	};
	[TaskChannels.get]: {
		args: [id: string];
		result: import('../tasks').TaskRecord | undefined;
	};
	[TaskChannels.cancel]: {
		args: [id: string];
		result: import('../tasks').TaskRecord;
	};
}

interface MonitorInvokeChannelMap {
	[MonitorChannels.snapshot]: {
		args: [filter?: import('../monitor').MonitorEventFilter];
		result: import('../monitor').MonitorSnapshot;
	};
	[MonitorChannels.list]: {
		args: [filter?: import('../monitor').MonitorEventFilter];
		result: import('../monitor').MonitorEventRecord[];
	};
	[MonitorChannels.get]: {
		args: [id: string];
		result: import('../monitor').MonitorEventRecord | undefined;
	};
}

interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('../skills').SkillInfo[] };
	[SkillsChannels.load]: { args: [name: string]; result: import('../skills').SkillDetails };
	[SkillsChannels.import]: { args: []; result: import('../skills').SkillImportResult | undefined };
	[SkillsChannels.download]: {
		args: [name: string];
		result: import('../skills').SkillDownloadResult | undefined;
	};
	[SkillsChannels.delete]: { args: [name: string]; result: import('../skills').SkillDeleteResult };
	[SkillsChannels.getRoot]: { args: []; result: string };
}

interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.catalog]: {
		args: [];
		result: typeof import('../connector').OPENAI_CONNECTOR_CATALOG;
	};
	[ConnectorsChannels.list]: { args: []; result: import('../connector').ConnectorView[] };
	[ConnectorsChannels.get]: {
		args: [id: string];
		result: import('../connector').ConnectorConfig;
	};
	[ConnectorsChannels.add]: {
		args: [input: import('../connector').ConnectorInput];
		result: import('../connector').ConnectorConfig;
	};
	[ConnectorsChannels.update]: {
		args: [id: string, input: import('../connector').ConnectorUpdateInput];
		result: import('../connector').ConnectorConfig;
	};
	[ConnectorsChannels.remove]: { args: [id: string]; result: void };
	[ConnectorsChannels.enable]: {
		args: [id: string];
		result: import('../connector').ConnectorConfig;
	};
	[ConnectorsChannels.disable]: {
		args: [id: string];
		result: import('../connector').ConnectorConfig;
	};
	[ConnectorsChannels.test]: {
		args: [id: string];
		result: import('../connector').ConnectorTestResult;
	};
	[ConnectorsChannels.reconnect]: {
		args: [id: string];
		result: import('../connector').ConnectorTestResult;
	};
	[ConnectorsChannels.refreshTools]: {
		args: [id: string];
		result: import('../connector').ConnectorTool[];
	};
	[ConnectorsChannels.listTools]: {
		args: [id: string];
		result: import('../connector').ConnectorTool[];
	};
	[ConnectorsChannels.callTool]: {
		args: [
			id: string,
			name: string,
			args: Record<string, unknown>,
			options?: import('../connector').ConnectorCallToolOptions,
		];
		result: unknown;
	};
	[ConnectorsChannels.connectOAuth]: {
		args: [id: string];
		result: import('../connector').ConnectorOAuthConnectResult;
	};
}

interface ChannelsInvokeChannelMap {
	[ChannelsChannels.listCatalog]: {
		args: [];
		result: import('../channels').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('../channels').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('../channels').ChannelType];
		result: import('../channels').Channel[import('../channels').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('../channels').ChannelType,
			config: import('../channels').Channel[import('../channels').ChannelType],
		];
		result: import('../channels').Channel[import('../channels').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('../channels').ChannelType];
		result: import('../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('../channels').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('../channels').TelegramChannelProperties];
		result: import('../channels').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('../channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('../channels').ChannelStatusEvent | undefined;
	};
}

interface StoreInvokeChannelMap {
	[StoreChannels.getProviders]: {
		args: [];
		result: import('../providers').PublicProvider[];
	};
	[StoreChannels.setProviderApiKey]: {
		args: [providerId: string, apiKey: string];
		result: void;
	};
	[StoreChannels.isProviderApiKeySaved]: {
		args: [providerId: string];
		result: boolean;
	};
	[StoreChannels.addProvider]: {
		args: [input: import('../providers').ProviderInput];
		result: import('../providers').PublicProvider;
	};
	[StoreChannels.getKeepAwakeEnabled]: {
		args: [];
		result: boolean;
	};
	[StoreChannels.setKeepAwakeEnabled]: {
		args: [enabled: boolean];
		result: boolean;
	};
	[StoreChannels.getAssistantSettings]: {
		args: [];
		result: import('../store').AssistantSettings | undefined;
	};
	[StoreChannels.getSpeechToTextSettings]: {
		args: [];
		result: import('../store').SpeechToTextSettings | undefined;
	};
	[StoreChannels.getTextToSpeechSettings]: {
		args: [];
		result: import('../store').TextToSpeechSettings | undefined;
	};
	[StoreChannels.getImageCreatorSettings]: {
		args: [];
		result: import('../store').ImageCreatorSettings | undefined;
	};
	[StoreChannels.getTextToVideoSettings]: {
		args: [];
		result: import('../store').TextToVideoSettings | undefined;
	};
	[StoreChannels.getTextToSoundSettings]: {
		args: [];
		result: import('../store').TextToSoundSettings | undefined;
	};
	[StoreChannels.getCronSettings]: {
		args: [];
		result: import('../store').CronSettings;
	};
	[StoreChannels.getTaskSettings]: {
		args: [];
		result: import('../store').TaskSettings;
	};
	[StoreChannels.getAgentRoutingSettings]: {
		args: [];
		result: import('../store').AgentRoutingSettings;
	};
	[StoreChannels.getConnectorSettings]: {
		args: [];
		result: import('../connectors').ConnectorConfig[];
	};
	[StoreChannels.getAssistantOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveAssistantOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getSpeechToTextOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveSpeechToTextOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getTextToSpeechOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveTextToSpeechOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getImageCreatorOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveImageCreatorOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getTextToVideoOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveTextToVideoOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getMusicCreatorOperator]: {
		args: [];
		result: import('../agents/service').ConfiguredModelOperator | undefined;
	};
	[StoreChannels.saveMusicCreatorOperator]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getAgentService]: {
		args: [];
		result: import('../agents/service').Agent | undefined;
	};
	[StoreChannels.saveAgentService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getSpeechTranscriberService]: {
		args: [];
		result: import('../agents/service').Agent | undefined;
	};
	[StoreChannels.saveSpeechTranscriberService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
}

interface PolicyInvokeChannelMap {
	[PolicyChannels.get]: {
		args: [];
		result: import('../policy').PolicyConfig;
	};
	[PolicyChannels.set]: {
		args: [policy: import('../policy').PolicyConfig];
		result: import('../policy').PolicyConfig;
	};
}

export interface InvokeChannelMap
	extends
		AppInvokeChannelMap,
		AgentInvokeChannelMap,
		SpeechToTextInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		TaskInvokeChannelMap,
		MonitorInvokeChannelMap,
		SkillsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		ChannelsInvokeChannelMap,
		StoreInvokeChannelMap,
		PolicyInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
	[RealtimeTranscriptionChannels.appendAudio]: {
		args: [sessionId: string, audio: string];
	};
	[SpeechToTextChannels.appendAudio]: {
		args: [sessionId: string, audio: string];
	};
}

interface AppEventChannelMap {
	[RealtimeTranscriptionChannels.event]: {
		data: import('../realtime-transcription').RealtimeTranscriptionEvent;
	};
}

interface SpeechToTextEventChannelMap {
	[SpeechToTextChannels.event]: {
		data: import('../speech-to-text').SpeechToTextEvent;
	};
}

interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../agents/service').AgentResponseEvent };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('../channels').ChannelStatusEvent };
}

interface CronEventChannelMap {
	[CronChannels.event]: { data: import('../cron').CronScheduleEvent };
}

interface HeartbeatEventChannelMap {
	[HeartbeatChannels.event]: { data: import('../heartbeat').HeartbeatEventPayload };
}

interface TaskEventChannelMap {
	[TaskChannels.event]: { data: import('../tasks').TaskEvent };
}

interface MonitorEventChannelMap {
	[MonitorChannels.event]: { data: import('../monitor').MonitorEventRecord };
}

export interface EventChannelMap
	extends
		AppEventChannelMap,
		SpeechToTextEventChannelMap,
		AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap,
		TaskEventChannelMap,
		MonitorEventChannelMap {}
