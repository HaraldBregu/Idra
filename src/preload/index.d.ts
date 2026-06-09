export interface WindowApi {
	minimize: () => void;
	close: () => void;
	popupMenu: () => void;
	isFullScreen: () => Promise<boolean>;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AgentApi {
	send_v2: (
		message: string,
		options?: Record<string, unknown>
	) => AsyncIterable<AgentResponseEvent>;
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
	settings: () => Promise<HeartbeatSettings>;
	saveSettings: (request: HeartbeatSettingsUpdate) => Promise<HeartbeatSettings>;
	setEnabled: (request: HeartbeatSetEnabledRequest) => Promise<HeartbeatStatus>;
	getTiming: () => Promise<HeartbeatTimingSettings>;
	updateTiming: (request: HeartbeatTimingSettings) => Promise<HeartbeatTimingSettings>;
	systemEvent: (request: HeartbeatSystemEventRequest) => Promise<HeartbeatSystemEventResult>;
	request: (request: HeartbeatWakeRequest) => Promise<void>;
	onEvent: (callback: (event: HeartbeatEventPayload) => void) => () => void;
}

export interface ChannelsApi {
	listCatalog: () => Promise<ChannelCatalogEntry[]>;
	getConfig: () => Promise<Channel>;
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	) => Promise<Channel[TKey]>;
	getStatus: (type?: ChannelType) => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

export interface ConnectorsApi {
	list: () => Promise<ConnectorRecord>;
	get: (id: string) => Promise<ConnectorRecord>;
	upsert: (input: ConnectorInput) => Promise<ConnectorRecord>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	getRoot: () => Promise<string>;
}

export interface ProviderStoreApi {
	get: (id: string) => Promise<Provider | undefined>;
	set: (id: string, provider: Provider) => Promise<Provider>;
}

import type { PublicProvider } from '../shared/providers';
import type { Provider } from '../shared/providers/types';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/app/cron';
import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../shared/heartbeat';
import type {
	AgentResponseEvent,
	Model,
	ModelSelection,
	AgentSendRuntimeOptions,
} from '../shared/agents/service';
import type { ChannelStatusEvent } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	ConnectorInput,
	ConnectorRecord,
	OAuthAuthorizeInput,
	OAuthAuthorizeResult,
} from '../shared/connectors';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
} from '../shared/skills';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app/app-permissions';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';

export interface AppApi {
	openAppDataFolder: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	authorizeOAuth: (input: OAuthAuthorizeInput) => Promise<OAuthAuthorizeResult>;
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

export interface AgentStoreApi {
	get: () => Promise<ModelSelection | undefined>;
	set: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

export interface RealtimeTranscriptionApi {
	start: (request?: RealtimeTranscriptionStartRequest) => Promise<RealtimeTranscriptionSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finish: (sessionId: string) => Promise<void>;
	cancel: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: RealtimeTranscriptionEvent) => void) => () => void;
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agentStore: AgentStoreApi;
		agent: AgentApi;
		realtimeTranscription: RealtimeTranscriptionApi;
		cron: CronApi;
		heartbeat: HeartbeatApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		providerStore: ProviderStoreApi;
	}
}
