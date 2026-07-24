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
	policyGet: () => Promise<PermissionsSchema>;
	policyPickDirectory: () => Promise<string | undefined>;
	policySetTool: (toolName: string, permission: ToolPermission) => Promise<PermissionsSchema>;
	policySetDirectories: (directories: DirectoryPermissions) => Promise<PermissionsSchema>;
	policyReset: () => Promise<PermissionsSchema>;
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
	libraryList: () => Promise<LibraryFile[]>;
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

export interface StorageApi {
	getStorages: () => Promise<StorageConfig[]>;
	saveStorageConfig: (config: StorageConfig) => Promise<StorageConfig>;
	deleteStorageConfig: (id: string) => Promise<void>;
	testConnection: (config: StorageConfig) => Promise<StorageTestResult>;
	listObjects: (id: string, prefix?: string) => Promise<StorageObjectInfo[]>;
	putObject: (id: string, key: string, data: Uint8Array, contentType?: string) => Promise<void>;
	getObject: (id: string, key: string) => Promise<Uint8Array>;
	deleteObject: (id: string, key: string) => Promise<void>;
	sync: (id: string, localDir: string, prefix?: string) => Promise<StorageSyncResult>;
	syncFolders: () => Promise<StorageSyncFolder[]>;
	push: (id: string) => Promise<StoragePushResult>;
	pull: (id: string) => Promise<StoragePullResult>;
}

export interface WidgetsApi {
	list: () => Promise<Widget[]>;
}

export interface NotesApi {
	list: () => Promise<Note[]>;
	get: (id: string) => Promise<Note | undefined>;
	create: (input: CreateNoteInput) => Promise<Note>;
	update: (id: string, updates: UpdateNoteInput) => Promise<Note | undefined>;
	delete: (id: string) => Promise<boolean>;
}

export interface SearchApi {
	getSettings: () => Promise<SearchSettings>;
	saveEngine: (engineId: SearchEngineId, input: SearchEngineInput) => Promise<SearchSettings>;
	selectEngine: (engineId: SearchEngineId) => Promise<SearchSettings>;
}

export interface ImageApi {
	createImage: (request: ImageRequest) => Promise<ImageResult>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

export interface VideoApi {
	createVideo: (request: VideoRequest) => Promise<VideoResult>;
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
}

export interface SoundApi {
	createSound: (request: SoundRequest) => Promise<SoundResult>;
	listSounds: () => Promise<SoundFile[]>;
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
import type { SearchEngineId, SearchEngineInput, SearchSettings } from '../shared/search_types';
import type {
	StorageConfig,
	StorageObjectInfo,
	StoragePullResult,
	StoragePushResult,
	StorageSyncFolder,
	StorageSyncResult,
	StorageTestResult,
} from '../shared/storage_types';
import type { McpOAuthStart, McpSettings } from '../shared/mcp_types';
import type { LibraryFile } from '../shared/library_types';
import type { Widget } from '../shared/widget_types';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../main/agent/notes/notes_types';
import type { CronRuntime, CronSchedule } from '../main/cron';
import type { HealthSettings } from '../main/agent/health/health_types';
import type {
	DirectoryPermissions,
	PermissionsSchema,
	ToolPermission,
} from '../main/agent/policy/policy_types';
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
import type { SoundFile, SoundRequest, SoundResult } from '../shared/sound_types';
import type { VideoRequest, VideoResult } from '../shared/video_types';
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
	AppLanguage,
	AppTheme,
} from '../shared/app_types';

export interface AppApi {
	getPathForFile: (file: File) => string;
	openAppDataFolder: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	getTrayEnabled: () => Promise<boolean>;
	setKeepAwake: (enabled: boolean) => Promise<void>;
	getKeepAwake: () => Promise<boolean>;
	setLanguage: (language: AppLanguage) => Promise<void>;
	getLanguage: () => Promise<AppLanguage>;
	setTheme: (theme: AppTheme) => Promise<void>;
	getTheme: () => Promise<AppTheme>;
	getMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	setMicrophoneEnabled: (enabled: boolean) => Promise<MicrophonePermissionSettings>;
	requestMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	openSystemPreference: (pane: SystemPreferencePaneId) => Promise<void>;
	getCameraPermission: () => Promise<CameraPermissionSettings>;
	setCameraEnabled: (enabled: boolean) => Promise<CameraPermissionSettings>;
	requestCameraPermission: () => Promise<CameraPermissionSettings>;
	openVideo: (path: string) => Promise<void>;
	showImageContextMenu: (path: string) => Promise<void>;
	showVideoContextMenu: (path: string) => Promise<void>;
	showAudioContextMenu: (path: string) => Promise<void>;
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		channels: ChannelsApi;
		storage: StorageApi;
		provider: ProviderApi;
		search: SearchApi;
		transcribe: TranscribeApi;
		voice: VoiceApi;
		image: ImageApi;
		video: VideoApi;
		sound: SoundApi;
		text: TextApi;
		widgets: WidgetsApi;
		notes: NotesApi;
	}
}
