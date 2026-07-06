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
	respondToolPermission: (
		toolCallId: string,
		decision: AgentToolPermissionDecision
	) => Promise<boolean>;
	listSessions: () => Promise<AgentSessionSummary[]>;
	getLastMessages: (sessionId: string) => Promise<AgentHistoryMessage[]>;
	clearMessages: (sessionId: string) => Promise<void>;
	deleteSession: (sessionId: string) => Promise<void>;
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
	healthGetData: () => Promise<string>;
	healthSaveData: (content: string) => Promise<string>;
	mcpList: () => Promise<McpSettings>;
	mcpGet: (id: string) => Promise<McpSettings>;
	mcpSave: (input: McpSettings) => Promise<McpSettings>;
	mcpDelete: (id: string) => Promise<void>;
	mcpOauthStart: (id: string) => Promise<McpOAuthStart>;
	mcpOauthFinish: (id: string, code: string) => Promise<void>;
}

export interface ChannelsApi {
	getConfig: () => Promise<Channel>;
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	) => Promise<Channel[TKey]>;
	getProviderId: () => Promise<string>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string>;
	setModelId: (modelId: string) => Promise<void>;
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

export interface ImageApi {
	createImage: (request: ImageRequest) => Promise<ImageResult>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

export interface TextApi {
	generateText: (request: TextRequest) => Promise<string>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

export interface VoiceApi {
	synthesize: (request: SpeechSynthesisRequest) => Promise<SpeechSynthesisResult>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

export interface TranscribeApi {
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

import type { PublicProvider } from '../shared';
import type { Provider } from '../shared/providers_types';
import type { McpOAuthStart, McpSettings } from '../shared/mcp_types';
import type { CronRuntime, CronSchedule } from '../main/agent/cron';
import type { HealthSettings } from '../main/agent/health/health_types';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentSessionSummary,
	AgentToolPermissionDecision,
} from '../shared/agent_types';
import type { ProviderModel } from '../shared';
import type { ChannelStatusEvent } from '../shared';
import type { Channel, ChannelType } from '../shared';
import type { ImageRequest, ImageResult } from '../shared/image_types';
import type { TextRequest } from '../shared/text_types';
import type { SpeechSynthesisRequest, SpeechSynthesisResult } from '../shared/speech_types';
import type {
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttTranscriptionRequest,
	SttTranscriptionResult,
	SttModelSelection,
	SttSelectionMode,
} from '../shared/stt_transcription';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
	SkillLoadResult,
} from '../shared/skills_types';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app_types';

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
	showImageContextMenu: (path: string) => Promise<void>;
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		channels: ChannelsApi;
		provider: ProviderApi;
		transcribe: TranscribeApi;
		voice: VoiceApi;
		image: ImageApi;
		text: TextApi;
	}
}
