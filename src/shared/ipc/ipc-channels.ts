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
	sendV2: 'agent:send-v2',
	response: 'agent:response',
	cancel: 'agent:cancel',
} as const;

export const ProviderStoreChannels = {
	get: 'provider-store:get',
	set: 'provider-store:set',
} as const;

export const AgentStoreChannels = {
	get: 'agent-store:get',
	set: 'agent-store:set',
} as const;

export const RealtimeTranscriptionChannels = {
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
	getProviders: 'app:get-providers',
	setProviderApiKey: 'app:set-provider-api-key',
	isProviderApiKeySaved: 'app:is-provider-api-key-saved',
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

interface AppInvokeChannelMap {
	[AppChannels.openAppDataFolder]: {
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
	[AppChannels.getMicrophonePermission]: {
		args: [];
		result: import('../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.openSystemPreference]: {
		args: [pane: import('../app/app-permissions').SystemPreferencePaneId];
		result: void;
	};
	[AppChannels.getCameraPermission]: {
		args: [];
		result: import('../app/app-permissions').CameraPermissionSettings;
	};
	[AppChannels.setCameraEnabled]: {
		args: [enabled: boolean];
		result: import('../app/app-permissions').CameraPermissionSettings;
	};
	[AppChannels.requestCameraPermission]: {
		args: [];
		result: import('../app/app-permissions').CameraPermissionSettings;
	};
	[AppChannels.getProviders]: {
		args: [];
		result: import('../providers').PublicProvider[];
	};
	[AppChannels.setProviderApiKey]: {
		args: [providerId: string, apiKey: string];
		result: void;
	};
	[AppChannels.isProviderApiKeySaved]: {
		args: [providerId: string];
		result: boolean;
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
	[SpeechToTextChannels.finishDictation]: {
		args: [sessionId: string];
		result: void;
	};
	[SpeechToTextChannels.cancelDictation]: {
		args: [sessionId: string];
		result: void;
	};
}

interface ProviderStoreInvokeChannelMap {
	[ProviderStoreChannels.get]: {
		args: [id: string];
		result: import('../providers/types').Provider | undefined;
	};
	[ProviderStoreChannels.set]: {
		args: [id: string, provider: import('../providers/types').Provider];
		result: import('../providers/types').Provider;
	};
}

interface AgentStoreInvokeChannelMap {
	[AgentStoreChannels.get]: {
		args: [];
		result: import('./agents/service').ModelSelection | undefined;
	};
	[AgentStoreChannels.set]: {
		args: [
			provider: import('../providers').PublicProvider,
			model: import('./agents/service').Model,
		];
		result: boolean;
	};
}

interface AgentInvokeChannelMap {
	[AgentChannels.sendV2]: {
		args: [message: string, options?: AgentSendRuntimeOptions];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
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
		args: [filter?: import('../app/cron').CronScheduleFilter];
		result: import('../app/cron').CronSchedule[];
	};
	[CronChannels.getSchedule]: {
		args: [scheduleId: string];
		result: import('../app/cron').CronSchedule;
	};
	[CronChannels.runNow]: {
		args: [scheduleId: string];
		result: import('../app/cron').CronScheduledTask;
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
	[HeartbeatChannels.settings]: {
		args: [];
		result: import('./heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.saveSettings]: {
		args: [request: import('./heartbeat').HeartbeatSettingsUpdate];
		result: import('./heartbeat').HeartbeatSettings;
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
	[HeartbeatChannels.setProviderId]: {
		args: [request: import('./heartbeat').HeartbeatSetProviderRequest];
		result: import('./heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setModelId]: {
		args: [request: import('./heartbeat').HeartbeatSetModelRequest];
		result: import('./heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setReasoningEffort]: {
		args: [request: import('./heartbeat').HeartbeatSetReasoningEffortRequest];
		result: import('./heartbeat').HeartbeatSettings;
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

export interface InvokeChannelMap
	extends
		AppInvokeChannelMap,
		AgentInvokeChannelMap,
		SpeechToTextInvokeChannelMap,
		AgentStoreInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		HeartbeatInvokeChannelMap,
		SkillsInvokeChannelMap,
		ChannelsInvokeChannelMap {}

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
		data: import('./realtime-transcription').RealtimeTranscriptionEvent;
	};
}

interface SpeechToTextEventChannelMap {
	[SpeechToTextChannels.event]: {
		data: import('../speech-to-text').SpeechToTextEvent;
	};
}

interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('./agents/service').AgentResponseEvent };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('../channels').ChannelStatusEvent };
}

interface CronEventChannelMap {
	[CronChannels.event]: { data: import('../app/cron').CronScheduleEvent };
}

interface HeartbeatEventChannelMap {
	[HeartbeatChannels.event]: { data: import('./heartbeat').HeartbeatEventPayload };
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
