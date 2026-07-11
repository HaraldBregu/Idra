export const AgentChannels = {
	send: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	respondToolPermission: 'agent:respond-tool-permission',
	listSessions: 'agent:list-sessions',
	lastMessages: 'agent:last-messages',
	clearMessages: 'agent:clear-messages',
	deleteSession: 'agent:delete-session',
	getProvider: 'agent:get-provider',
	setProvider: 'agent:set-provider',
	getModelId: 'agent:get-model-id',
	setModelId: 'agent:set-model-id',
	cronList: 'agent:cron:list',
	cronGetRuntime: 'agent:cron:runtime:get',
	cronSetRuntime: 'agent:cron:runtime:set',
	skillsList: 'agent:skills:list',
	skillsLoad: 'agent:skills:load',
	skillsImport: 'agent:skills:import',
	skillsDownload: 'agent:skills:download',
	skillsDelete: 'agent:skills:delete',
	skillsSetEnabled: 'agent:skills:set-enabled',
	skillsOpenRoot: 'agent:skills:open-root',
	skillsGetRoot: 'agent:skills:get-root',
	healthSettings: 'agent:health:settings',
	healthSaveSettings: 'agent:health:settings:save',
	healthResetSettings: 'agent:health:settings:reset',
	healthData: 'agent:health:data',
	healthSaveData: 'agent:health:data:save',
	mcpList: 'agent:mcp:list',
	mcpGet: 'agent:mcp:get',
	mcpSave: 'agent:mcp:save',
	mcpDelete: 'agent:mcp:delete',
	mcpOauthStart: 'agent:mcp:oauth:start',
	mcpOauthFinish: 'agent:mcp:oauth:finish',
} as const;

export const AppChannels = {
	openAppDataFolder: 'app:open-app-data-folder',
	openExternalUrl: 'app:open-external-url',
	openSystemPreference: 'app:open-system-preference',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	setKeepAwake: 'app:set-keep-awake',
	getKeepAwake: 'app:get-keep-awake',
	setLanguage: 'app:set-language',
	getLanguage: 'app:get-language',
	setTheme: 'app:set-theme',
	getTheme: 'app:get-theme',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
	getCameraPermission: 'app:get-camera-permission',
	setCameraEnabled: 'app:set-camera-enabled',
	requestCameraPermission: 'app:request-camera-permission',
	openVideo: 'app:open-video',
	showImageContextMenu: 'app:show-image-context-menu',
	showVideoContextMenu: 'app:show-video-context-menu',
	showAudioContextMenu: 'app:show-audio-context-menu',
} as const;

export const ChannelsChannels = {
	getConfig: 'channels:get-config',
	getChannelConfig: 'channels:get-channel-config',
	saveChannelConfig: 'channels:save-channel-config',
	getProviderId: 'channels:get-provider-id',
	setProviderId: 'channels:set-provider-id',
	getModelId: 'channels:get-model-id',
	setModelId: 'channels:set-model-id',
	getStatus: 'channels:get-status',
	getTelegramConfig: 'channels:telegram:get-config',
	saveTelegramConfig: 'channels:telegram:save-config',
	getTelegramStatus: 'channels:telegram:get-status',
	startTelegram: 'channels:telegram:start',
	stopTelegram: 'channels:telegram:stop',
	restartTelegram: 'channels:telegram:restart',
	statusChanged: 'channels:status-changed',
} as const;

export const ImageChannels = {
	createImage: 'image:create-image',
	getModelId: 'image:get-model-id',
	getProviderId: 'image:get-provider-id',
	setModelId: 'image:set-model-id',
	setProviderId: 'image:set-provider-id',
} as const;

export const SoundChannels = {
	createSound: 'sound:create-sound',
	listSounds: 'sound:list-sounds',
	getModelId: 'sound:get-model-id',
	getProviderId: 'sound:get-provider-id',
	setModelId: 'sound:set-model-id',
	setProviderId: 'sound:set-provider-id',
} as const;

export const ProviderChannels = {
	get: 'provider-store:get',
	set: 'provider-store:set',
} as const;

export const ProviderStoreChannels = ProviderChannels;

export const SpeechChannels = {
	getModelId: 'speech:get-model-id',
	getProviderId: 'speech:get-provider-id',
	setModelId: 'speech:set-model-id',
	setProviderId: 'speech:set-provider-id',
	synthesize: 'speech:synthesize',
} as const;

export const SttChannels = {
	appendRealtimeAudio: 'stt:append-realtime-audio',
	cancelRealtime: 'stt:cancel-realtime',
	finishRealtime: 'stt:finish-realtime',
	getModelId: 'stt:get-model-id',
	getProviderId: 'stt:get-provider-id',
	getSelection: 'stt:get-selection',
	listModels: 'stt:list-models',
	listProviders: 'stt:list-providers',
	realtimeEvent: 'stt:realtime-event',
	saveSelection: 'stt:save-selection',
	setModelId: 'stt:set-model-id',
	setProviderId: 'stt:set-provider-id',
	startRealtime: 'stt:start-realtime',
	transcribe: 'stt:transcribe',
} as const;

export const TextChannels = {
	generateText: 'text:generate-text',
	getModelId: 'text:get-model-id',
	getProviderId: 'text:get-provider-id',
	setModelId: 'text:set-model-id',
	setProviderId: 'text:set-provider-id',
} as const;

export const VideoChannels = {
	createVideo: 'video:create-video',
	getModelId: 'video:get-model-id',
	getProviderId: 'video:get-provider-id',
	setModelId: 'video:set-model-id',
	setProviderId: 'video:set-provider-id',
} as const;

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
