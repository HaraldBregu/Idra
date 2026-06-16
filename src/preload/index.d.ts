export interface WindowApi {
	minimize: () => void;
	close: () => void;
	popupMenu: () => void;
	isFullScreen: () => Promise<boolean>;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AgentApi {
	send: (
		message: string,
		options?: Record<string, unknown>,
		onEvent?: (event: AgentResponseEvent) => void
	) => Promise<string>;
	cancel: () => Promise<void>;
	getLastMessages: (sessionId: string) => Promise<AgentHistoryMessage[]>;
	clearMessages: (sessionId: string) => Promise<void>;
	getProvider: () => Promise<PublicProvider | undefined>;
	setProvider: (provider: PublicProvider) => Promise<boolean>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<boolean>;
}

export interface CronApi {
	pauseSchedule: (scheduleId: string) => Promise<void>;
	resumeSchedule: (scheduleId: string) => Promise<void>;
	deleteSchedule: (scheduleId: string) => Promise<void>;
	deleteJob: (jobId: string) => Promise<void>;
	listSchedules: (filter?: CronScheduleFilter) => Promise<CronSchedule[]>;
	listJobs: () => Promise<CronJobInfo[]>;
	getSchedule: (scheduleId: string) => Promise<CronSchedule>;
	runNow: (scheduleId: string) => Promise<CronScheduledTask>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
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
	authorizeOAuth: (input: ConnectorOAuthDefaults) => Promise<ConnectorOAuthAuthorizationResult>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	getRoot: () => Promise<string>;
}

export interface ProviderApi {
	get: (id: string) => Promise<Provider | undefined>;
	set: (id: string, provider: Provider) => Promise<Provider>;
}

export interface SttApi {
	transcribe: (request: SttTranscriptionRequest) => Promise<SttTranscriptionResult>;
	startRealtime: (request?: SttRealtimeStartRequest) => Promise<SttRealtimeSession>;
	appendRealtimeAudio: (sessionId: string, audio: string) => Promise<void>;
	finishRealtime: (sessionId: string) => Promise<void>;
	cancelRealtime: (sessionId: string) => Promise<void>;
	onRealtimeEvent: (callback: (event: SttRealtimeEvent) => void) => () => void;
	getSelection: () => Promise<SttModelSelection | undefined>;
	listProviders: () => Promise<PublicProvider[]>;
	listModels: (providerId: string) => Promise<Model[]>;
	saveSelection: (providerId: string, modelId: string) => Promise<boolean>;
}

import type { PublicProvider } from '../shared/providers';
import type { Provider } from '../shared/providers/types';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
	CronJobInfo,
} from '../shared/app/cron';
import type { AgentHistoryMessage, AgentResponseEvent } from '../shared/agent/types';
import type { ProviderModel as Model } from '../shared/providers';
import type { ChannelStatusEvent } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	ConnectorInput,
	ConnectorOAuthAuthorizationResult,
	ConnectorOAuthDefaults,
	ConnectorSettingsRecord,
} from '../shared/connector';
import type {
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttTranscriptionRequest,
	SttTranscriptionResult,
	SttModelSelection,
} from '../shared/stt/transcription';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
} from '../shared/skills/types';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app/app-permissions';
import type { McpNamedEntry, McpServerInfo } from '../shared/mcp/types';

export interface ModelSelection {
	provider: PublicProvider;
	model: Model;
}

export type ConnectorRecord = ConnectorSettingsRecord;
export type { ConnectorInput, ConnectorOAuthAuthorizationResult, ConnectorOAuthDefaults };
export type { McpNamedEntry, McpServerInfo };

export interface McpApi {
	listServers: () => Promise<McpNamedEntry[]>;
	upsertServer: (entry: McpNamedEntry) => Promise<void>;
	deleteServer: (name: string) => Promise<void>;
	status: () => Promise<McpServerInfo[]>;
}

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
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		cron: CronApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		provider: ProviderApi;
		stt: SttApi;
		mcp: McpApi;
	}
}
