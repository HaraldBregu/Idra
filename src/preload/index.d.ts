export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	popupMenu: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AgentApi {
	send: (message: string, options?: AgentSendRuntimeOptions) => Promise<string>;
	reset: () => Promise<void>;
	cancel: () => Promise<void>;
	getHistory: () => Promise<AgentHistoryMessage[]>;
	openHistoryFolder: () => Promise<void>;
	listStartupFiles: () => Promise<AgentStartupFileSummary[]>;
	readStartupFile: (name: string) => Promise<AgentStartupFileContent>;
	writeStartupFile: (name: string, content: string) => Promise<AgentStartupFileContent>;
	/** @deprecated Use listStartupFiles. */
	listWorkspaceFiles: () => Promise<WorkspaceFileSummary[]>;
	/** @deprecated Use readStartupFile. */
	readWorkspaceFile: (name: string) => Promise<WorkspaceFileContent>;
	/** @deprecated Use writeStartupFile. */
	writeWorkspaceFile: (name: string, content: string) => Promise<WorkspaceFileContent>;
	onResponse: (callback: (event: AgentResponseEvent) => void) => () => void;
}

export interface CronApi {
	pauseSchedule: (scheduleId: string) => Promise<void>;
	resumeSchedule: (scheduleId: string) => Promise<void>;
	deleteSchedule: (scheduleId: string) => Promise<void>;
	listSchedules: (filter?: CronScheduleFilter) => Promise<CronSchedule[]>;
	getSchedule: (scheduleId: string) => Promise<CronSchedule>;
	runNow: (scheduleId: string) => Promise<CronScheduledTask>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
}

export interface HeartbeatApi {
	status: () => Promise<HeartbeatStatus>;
	last: () => Promise<HeartbeatEventPayload | null>;
	settings: () => Promise<HeartbeatSettings>;
	saveSettings: (request: HeartbeatSettingsUpdate) => Promise<HeartbeatSettings>;
	setEnabled: (request: HeartbeatSetEnabledRequest) => Promise<HeartbeatStatus>;
	getTiming: () => Promise<HeartbeatTimingSettings>;
	updateTiming: (request: HeartbeatTimingSettings) => Promise<HeartbeatTimingSettings>;
	setProviderId: (request: HeartbeatSetProviderRequest) => Promise<HeartbeatSettings>;
	setModelId: (request: HeartbeatSetModelRequest) => Promise<HeartbeatSettings>;
	setReasoningEffort: (
		request: HeartbeatSetReasoningEffortRequest
	) => Promise<HeartbeatSettings>;
	systemEvent: (request: HeartbeatSystemEventRequest) => Promise<HeartbeatSystemEventResult>;
	request: (request: HeartbeatWakeRequest) => Promise<void>;
	onEvent: (callback: (event: HeartbeatEventPayload) => void) => () => void;
}

export interface ChannelsApi {
	listCatalog: () => Promise<ChannelCatalogEntry[]>;
	getConfig: () => Promise<Channel>;
	getChannelConfig: <TKey extends ChannelType>(type: TKey) => Promise<Channel[TKey]>;
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	) => Promise<Channel[TKey]>;
	getStatus: (type?: ChannelType) => Promise<ChannelStatusEvent | undefined>;
	getTelegramConfig: () => Promise<TelegramChannelProperties>;
	saveTelegramConfig: (config: TelegramChannelProperties) => Promise<TelegramChannelProperties>;
	getTelegramStatus: () => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

export interface ConnectorsApi {
	list: () => Promise<ConnectorView[]>;
	get: (id: string) => Promise<ConnectorConfig>;
	save: (input: ConnectorInput[]) => Promise<ConnectorConfig[]>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	load: (name: string) => Promise<SkillDetails>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	getRoot: () => Promise<string>;
}

export interface StoreApi {
	getProviders: () => Promise<PublicProvider[]>;
	setProviderApiKey: (providerId: string, apiKey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getAssistantSettings: () => Promise<AssistantSettings | undefined>;
	getSpeechToTextSettings: () => Promise<SpeechToTextSettings | undefined>;
	getTextToSpeechSettings: () => Promise<TextToSpeechSettings | undefined>;
	getImageCreatorSettings: () => Promise<ImageCreatorSettings | undefined>;
	getTextToVideoSettings: () => Promise<TextToVideoSettings | undefined>;
	getTextToSoundSettings: () => Promise<TextToSoundSettings | undefined>;
	getCronSettings: () => Promise<CronSettings>;
	getTaskSettings: () => Promise<TaskSettings>;
	getAgentRoutingSettings: () => Promise<AgentRoutingSettings>;
	getConnectorSettings: () => Promise<ConnectorConfig[]>;
	getAgentService: () => Promise<ModelSelection | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<ModelSelection | undefined>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSpeechService: () => Promise<ModelSelection | undefined>;
	saveTextToSpeechService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageCreatorService: () => Promise<ModelSelection | undefined>;
	saveImageCreatorService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToVideoService: () => Promise<ModelSelection | undefined>;
	saveTextToVideoService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSoundService: () => Promise<ModelSelection | undefined>;
	saveTextToSoundService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

import type { ProviderInput, PublicProvider } from '../shared/providers';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/cron';
import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatSetModelRequest,
	HeartbeatSetProviderRequest,
	HeartbeatSetReasoningEffortRequest,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../shared/heartbeat';
import type {
	AssistantSettings,
	AgentRoutingSettings,
	CronSettings,
	ImageCreatorSettings,
	SpeechToTextSettings,
	TextToSoundSettings,
	TextToSpeechSettings,
	TextToVideoSettings,
	TaskSettings,
} from '../shared/store';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	Model,
	ModelSelection,
	AgentStartupFileContent,
	AgentStartupFileSummary,
	WorkspaceFileContent,
	WorkspaceFileSummary,
	AgentSendRuntimeOptions,
} from '../shared/agents/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	SkillDeleteResult,
	SkillDetails,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
} from '../shared/skills';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app-permissions';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';
import type {
	SpeechToTextDictationSession,
	SpeechToTextDictationStartRequest,
	SpeechToTextEvent,
	SpeechToTextTranscribeRequest,
	SpeechToTextTranscription,
} from '../shared/speech-to-text';
import type {
	ConnectorConfig,
	ConnectorInput,
	ConnectorView,
} from '../shared/connector';

export interface AppApi {
	openAppDataFolder: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	getTrayEnabled: () => Promise<boolean>;
	getMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	setMicrophoneEnabled: (enabled: boolean) => Promise<MicrophonePermissionSettings>;
	requestMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	openSystemPreference: (pane: SystemPreferencePaneId) => Promise<void>;
	getCameraPermission: () => Promise<CameraPermissionSettings>;
	setCameraEnabled: (enabled: boolean) => Promise<CameraPermissionSettings>;
	requestCameraPermission: () => Promise<CameraPermissionSettings>;
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAgentService: () => Promise<ModelSelection | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<ModelSelection | undefined>;
	getSpeechToTextModels: (provider: PublicProvider) => Promise<Model[]>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSpeechService: () => Promise<ModelSelection | undefined>;
	getTextToSpeechModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToSpeechService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageCreatorService: () => Promise<ModelSelection | undefined>;
	getImageCreatorModels: (provider: PublicProvider) => Promise<Model[]>;
	saveImageCreatorService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToVideoService: () => Promise<ModelSelection | undefined>;
	getTextToVideoModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToVideoService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSoundService: () => Promise<ModelSelection | undefined>;
	getTextToSoundModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToSoundService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

export interface RealtimeTranscriptionApi {
	start: (request?: RealtimeTranscriptionStartRequest) => Promise<RealtimeTranscriptionSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finish: (sessionId: string) => Promise<void>;
	cancel: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: RealtimeTranscriptionEvent) => void) => () => void;
}

export interface SpeechToTextApi {
	transcribe: (request: SpeechToTextTranscribeRequest) => Promise<SpeechToTextTranscription>;
	startDictation: (
		request?: SpeechToTextDictationStartRequest
	) => Promise<SpeechToTextDictationSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finishDictation: (sessionId: string) => Promise<void>;
	cancelDictation: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: SpeechToTextEvent) => void) => () => void;
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		realtimeTranscription: RealtimeTranscriptionApi;
		speechToText: SpeechToTextApi;
		cron: CronApi;
		heartbeat: HeartbeatApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		store: StoreApi;
	}
}
