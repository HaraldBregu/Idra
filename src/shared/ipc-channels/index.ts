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
	sendV2: 'agent:send-v2',
	reset: 'agent:reset',
	getHistory: 'agent:get-history',
	openHistoryFolder: 'agent:open-history-folder',
	response: 'agent:response',
	cancel: 'agent:cancel',
	listStartupFiles: 'agent:list-startup',
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
	getSpeechToTextModels: 'provider:get-speech-to-text-models',
	getTextToSpeechModels: 'provider:get-text-to-speech-models',
	getImageCreatorModels: 'provider:get-image-creator-models',
	getTextToVideoModels: 'provider:get-text-to-video-models',
	getTextToSoundModels: 'provider:get-text-to-sound-models',
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

export const SpeechToTextChannels = {
	transcribe: 'speech-to-text:transcribe',
	startDictation: 'speech-to-text:start-dictation',
	appendAudio: 'speech-to-text:append-audio',
	finishDictation: 'speech-to-text:finish-dictation',
	cancelDictation: 'speech-to-text:cancel-dictation',
	event: 'speech-to-text:event',
} as const;

export const AppChannels = {
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	openAppDataFolder: 'app:open-app-data-folder',
	openExternalUrl: 'app:open-external-url',
	authorizeOAuth: 'app:authorize-oauth',
	openSystemPreference: 'app:open-system-preference',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
	getCameraPermission: 'app:get-camera-permission',
	setCameraEnabled: 'app:set-camera-enabled',
	requestCameraPermission: 'app:request-camera-permission',
} as const;

export const CronChannels = {
	pauseSchedule: 'cron:pauseSchedule',
	resumeSchedule: 'cron:resumeSchedule',
	deleteSchedule: 'cron:deleteSchedule',
	listSchedules: 'cron:listSchedules',
	getSchedule: 'cron:getSchedule',
	runNow: 'cron:runNow',
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

export const SkillsChannels = {
	list: 'skills:list',
	load: 'skills:load',
	import: 'skills:import',
	download: 'skills:download',
	delete: 'skills:delete',
	getRoot: 'skills:get-root',
} as const;

export const ConnectorsChannels = {
	list: 'connectors:list',
	save: 'connectors:save',
	upsert: 'connectors:upsert',
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
	getAssistantSettings: 'store:get-assistant-settings',
	getSpeechToTextSettings: 'store:get-speech-to-text-settings',
	getTextToSpeechSettings: 'store:get-text-to-speech-settings',
	getImageCreatorSettings: 'store:get-image-creator-settings',
	getTextToVideoSettings: 'store:get-text-to-video-settings',
	getTextToSoundSettings: 'store:get-text-to-sound-settings',
	getCronSettings: 'store:get-cron-settings',
	getTaskSettings: 'store:get-task-settings',
	getAgentRoutingSettings: 'store:get-agent-routing-settings',
	getAgentService: 'store:get-agent-service',
	saveAgentService: 'store:save-agent-service',
	getSpeechTranscriberService: 'store:get-speech-transcriber-service',
	saveSpeechTranscriberService: 'store:save-speech-transcriber-service',
	getTextToSpeechService: 'store:get-text-to-speech-service',
	saveTextToSpeechService: 'store:save-text-to-speech-service',
	getImageCreatorService: 'store:get-image-creator-service',
	saveImageCreatorService: 'store:save-image-creator-service',
	getTextToVideoService: 'store:get-text-to-video-service',
	saveTextToVideoService: 'store:save-text-to-video-service',
	getTextToSoundService: 'store:get-text-to-sound-service',
	saveTextToSoundService: 'store:save-text-to-sound-service',
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
	[AppChannels.openExternalUrl]: {
		args: [url: string];
		result: void;
	};
	[AppChannels.authorizeOAuth]: {
		args: [input: import('../connectors').OAuthAuthorizeInput];
		result: import('../connectors').OAuthAuthorizeResult;
	};
	[AppChannels.setTrayEnabled]: {
		args: [enabled: boolean];
		result: void;
	};
	[AppChannels.getTrayEnabled]: {
		args: [];
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
	[ProviderChannels.getSpeechToTextModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getTextToSpeechModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getImageCreatorModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getTextToVideoModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getTextToSoundModels]: {
		args: [provider: import('../providers').PublicProvider];
		result: import('../agents/service').Model[];
	};
	[ProviderChannels.getAgentService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
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
		result: import('../agents/service').ModelSelection | undefined;
	};
	[ProviderChannels.saveSpeechTranscriberService]: {
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
	[AgentChannels.sendV2]: {
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
	[ConnectorsChannels.list]: { args: []; result: import('../connectors').ConnectorRecord };
	[ConnectorsChannels.get]: { args: [id: string]; result: import('../connectors').ConnectorRecord };
	[ConnectorsChannels.save]: {
		args: [input: import('../connectors').ConnectorInput[]];
		result: import('../connectors').ConnectorRecord;
	};
	[ConnectorsChannels.upsert]: {
		args: [input: import('../connectors').ConnectorInput];
		result: import('../connectors').ConnectorRecord;
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
	[StoreChannels.getAgentService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
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
		result: import('../agents/service').ModelSelection | undefined;
	};
	[StoreChannels.saveSpeechTranscriberService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getTextToSpeechService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
	};
	[StoreChannels.saveTextToSpeechService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getImageCreatorService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
	};
	[StoreChannels.saveImageCreatorService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getTextToVideoService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
	};
	[StoreChannels.saveTextToVideoService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
	[StoreChannels.getTextToSoundService]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
	};
	[StoreChannels.saveTextToSoundService]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
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
		SkillsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		ChannelsInvokeChannelMap,
		StoreInvokeChannelMap {}

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

export interface EventChannelMap
	extends
		AppEventChannelMap,
		SpeechToTextEventChannelMap,
		AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		CronEventChannelMap,
		HeartbeatEventChannelMap {}
