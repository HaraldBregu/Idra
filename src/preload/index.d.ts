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
	skillsList: () => Promise<SkillInfo[]>;
	skillsLoad: (name: string) => Promise<SkillLoadResult | undefined>;
	skillsImport: () => Promise<SkillImportResult | undefined>;
	skillsDownload: (name: string) => Promise<SkillDownloadResult | undefined>;
	skillsDelete: (name: string) => Promise<SkillDeleteResult>;
	skillsSetEnabled: (id: string, enabled: boolean) => Promise<SkillInfo>;
	skillsOpenRoot: () => Promise<void>;
	skillsGetRoot: () => Promise<string>;
	cronList: () => Promise<CronSchedule[]>;
	cronGetRuntime: () => Promise<CronRuntime | undefined>;
	cronSetRuntime: (providerId: string, modelId: string) => Promise<CronRuntime>;
	healthGetSettings: () => Promise<HealthSettings>;
	healthSaveSettings: (settings: Partial<HealthSettings>) => Promise<HealthSettings>;
	healthResetSettings: () => Promise<HealthSettings>;
	mcpList: () => Promise<McpSettings>;
	mcpGet: (id: string) => Promise<McpSettings>;
	mcpSave: (input: McpSettings) => Promise<McpSettings>;
	mcpDelete: (id: string) => Promise<void>;
	mcpOauthStart: (id: string) => Promise<McpOAuthStart>;
	mcpOauthFinish: (id: string, code: string) => Promise<void>;
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

export interface ProviderApi {
	get: (id: string) => Promise<Provider | undefined>;
	set: (id: string, provider: Provider) => Promise<Provider>;
}

export interface VoiceApi {
	transcribe: (request: SttTranscriptionRequest) => Promise<SttTranscriptionResult>;
	startRealtime: (request?: SttRealtimeStartRequest) => Promise<SttRealtimeSession>;
	appendRealtimeAudio: (sessionId: string, audio: string) => Promise<void>;
	finishRealtime: (sessionId: string) => Promise<void>;
	cancelRealtime: (sessionId: string) => Promise<void>;
	onRealtimeEvent: (callback: (event: SttRealtimeEvent) => void) => () => void;
	getSelection: (mode?: SttSelectionMode) => Promise<SttModelSelection | undefined>;
	listProviders: () => Promise<PublicProvider[]>;
	listModels: (providerId: string) => Promise<ProviderModel[]>;
	saveSelection: (providerId: string, modelId: string, mode?: SttSelectionMode) => Promise<boolean>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

import type { PublicProvider } from '../shared/providers';
import type { Provider } from '../shared/providers.types';
import type { McpOAuthStart, McpSettings } from '../shared/mcp';
import type { CronRuntime, CronSchedule } from '../main/agent/cron';
import type { HealthSettings } from '../main/agent/health/health-types';
import type { AgentHistoryMessage, AgentResponseEvent } from '../shared/agent.types';
import type { ProviderModel } from '../shared/providers';
import type { ChannelStatusEvent } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttTranscriptionRequest,
	SttTranscriptionResult,
	SttModelSelection,
	SttSelectionMode,
} from '../shared/stt/transcription';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
	SkillLoadResult,
} from '../shared/skills.types';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app/app-permissions';

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
		channels: ChannelsApi;
		provider: ProviderApi;
		voice: VoiceApi;
	}
}
