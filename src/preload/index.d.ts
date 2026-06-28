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

export interface McpApi {
	list: () => Promise<McpSettings>;
	get: (id: string) => Promise<McpSettings>;
	save: (input: McpSettings) => Promise<McpSettings>;
	delete: (id: string) => Promise<void>;
	oauthStart: (id: string) => Promise<McpOAuthStart>;
	oauthFinish: (id: string, code: string) => Promise<void>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	setEnabled: (id: string, enabled: boolean) => Promise<SkillInfo>;
	openRoot: () => Promise<void>;
	getRoot: () => Promise<string>;
}

export interface ProviderApi {
	get: (id: string) => Promise<Provider | undefined>;
	set: (id: string, provider: Provider) => Promise<Provider>;
}

export interface TasksApi {
	list: () => Promise<CronSchedule[]>;
	getRuntime: () => Promise<CronRuntime | undefined>;
	setRuntime: (providerId: string, modelId: string) => Promise<CronRuntime>;
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
	listModels: (providerId: string) => Promise<ProviderModel[]>;
	saveSelection: (providerId: string, modelId: string) => Promise<boolean>;
}

import type { PublicProvider } from '../shared/providers';
import type { Provider } from '../shared/providers/types';
import type { McpOAuthStart, McpSettings } from '../shared/mcp';
import type { CronRuntime, CronSchedule } from '../main/cron/types';
import type { AgentHistoryMessage, AgentResponseEvent } from '../shared/agent/types';
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
		mcp: McpApi;
		skills: SkillsApi;
		provider: ProviderApi;
		stt: SttApi;
		tasks: TasksApi;
	}
}
