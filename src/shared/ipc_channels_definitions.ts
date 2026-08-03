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
	policyGet: 'agent:policy:get',
	policyPickDirectory: 'agent:policy:permission:pick',
	policySetTool: 'agent:policy:tool:set',
	policySetDirectories: 'agent:policy:directories:set',
	policySetMode: 'agent:policy:mode:set',
	policyReset: 'agent:policy:reset',
	healthSettings: 'agent:health:settings',
	healthSaveSettings: 'agent:health:settings:save',
	healthResetSettings: 'agent:health:settings:reset',
	healthData: 'agent:health:data',
	healthSaveData: 'agent:health:data:save',
	ragIndex: 'agent:rag:index',
	ragSearch: 'agent:rag:search',
	ragOpenFolder: 'agent:rag:folder:open',
} as const;

export const RecorderChannels = {
	microphone: {
		start: 'recorder:microphone:start',
		stop: 'recorder:microphone:stop',
		cancel: 'recorder:microphone:cancel',
		list: 'recorder:microphone:list',
		complete: 'recorder:microphone:complete',
		command: 'recorder:microphone:command',
		event: 'recorder:microphone:event',
	},
	camera: {
		start: 'recorder:camera:start',
		stop: 'recorder:camera:stop',
		cancel: 'recorder:camera:cancel',
		list: 'recorder:camera:list',
		complete: 'recorder:camera:complete',
		command: 'recorder:camera:command',
		event: 'recorder:camera:event',
	},
	screen: {
		start: 'recorder:screen:start',
		stop: 'recorder:screen:stop',
		cancel: 'recorder:screen:cancel',
		list: 'recorder:screen:list',
		complete: 'recorder:screen:complete',
		command: 'recorder:screen:command',
		event: 'recorder:screen:event',
	},
} as const;

export const CronChannels = {
	list: 'cron:list',
	getRuntime: 'cron:runtime:get',
	setRuntime: 'cron:runtime:set',
} as const;

export const SkillsChannels = {
	list: 'skills:list',
	load: 'skills:load',
	import: 'skills:import',
	download: 'skills:download',
	delete: 'skills:delete',
	setEnabled: 'skills:set-enabled',
	openRoot: 'skills:open-root',
	getRoot: 'skills:get-root',
} as const;

export const McpChannels = {
	list: 'mcp:list',
	get: 'mcp:get',
	save: 'mcp:save',
	delete: 'mcp:delete',
	oauthStart: 'mcp:oauth:start',
	oauthFinish: 'mcp:oauth:finish',
} as const;

export const AppChannels = {
	openAppDataFolder: 'app:open-app-data-folder',
	openDataFolder: 'app:open-data-folder',
	openProvidersFolder: 'app:open-providers-folder',
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
	models: 'app:models',
	databases: 'app:databases',
	storages: 'app:storages',
	webSearches: 'app:web-searches',
	mcps: 'app:mcps',
	bots: 'app:bots',
	modelsChanged: 'app:models-changed',
	uploadProvider: 'app:upload-provider',
	getChannelsStatus: 'app:channels:get-status',
	startTelegram: 'app:channels:telegram:start',
	stopTelegram: 'app:channels:telegram:stop',
	restartTelegram: 'app:channels:telegram:restart',
	channelsStatusChanged: 'app:channels:status-changed',
} as const;

export const EmbeddingChannels = {
	createEmbedding: 'embedding:create-embedding',
	getModelId: 'embedding:get-model-id',
	getProviderId: 'embedding:get-provider-id',
	setModelId: 'embedding:set-model-id',
	setProviderId: 'embedding:set-provider-id',
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
	list: 'provider-store:list',
} as const;

export const ProviderStoreChannels = ProviderChannels;

export const StorageChannels = {
	getStorages: 'storage:get-all',
	getStorageConfiguration: 'storage:configuration:get',
	saveStorageConfiguration: 'storage:configuration:save',
	saveStorageConfig: 'storage:save',
	deleteStorageConfig: 'storage:delete',
	testConnection: 'storage:test-connection',
	listObjects: 'storage:list-objects',
	putObject: 'storage:put-object',
	getObject: 'storage:get-object',
	deleteObject: 'storage:delete-object',
	sync: 'storage:sync',
	syncFolders: 'storage:sync-folders',
	pickFolders: 'storage:pick-folders',
	push: 'storage:push',
	pull: 'storage:pull',
} as const;

export const DatabaseChannels = {
	getConfiguration: 'database:configuration:get',
	saveConfiguration: 'database:configuration:save',
} as const;

export const SearchChannels = {
	getSettings: 'search:settings:get',
	saveEngine: 'search:engine:save',
	selectEngine: 'search:engine:select',
} as const;

export const WikiChannels = {
	getSettings: 'wiki:settings:get',
	getStatus: 'wiki:status:get',
	saveSettings: 'wiki:settings:save',
	run: 'wiki:run',
	pickDirectory: 'wiki:directory:pick',
	openDirectory: 'wiki:directory:open',
} as const;

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

export const ExtensionChannels = {
	list: 'extensions:list',
	open: 'extensions:open',
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
