import type { SpeechSynthesisRequest, SpeechSynthesisResult } from './speech_types';
import type {
	SttModelSelection,
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttSelectionMode,
	SttTranscriptionRequest,
	SttTranscriptionResult,
} from './stt_transcription';
import type { PublicProvider } from './provider_types';
import type { ProviderModel } from './model_types';
import type { EmbeddingRequest, EmbeddingResult } from './embedding_types';
import type { ImageRequest, ImageResult } from './image_types';
import type { SoundFile, SoundRequest, SoundResult } from './sound_types';
import type { VideoRequest, VideoResult } from './video_types';
import type { TextRequest } from './text_types';
import type {
	RecordConfig,
	Recording,
	RecorderCaptureResult,
	RecorderCommand,
} from './recorder_types';
import {
	AgentChannels,
	AppChannels,
	RecorderChannels,
	TaskChannels,
	McpChannels,
	SkillsChannels,
	StorageChannels,
	DatabaseChannels,
	EmbeddingChannels,
	ImageChannels,
	SoundChannels,
	ProviderChannels,
	SearchChannels,
	SpeechChannels,
	SttChannels,
	TextChannels,
	VideoChannels,
	ExtensionChannels,
	WikiChannels,
	WindowChannels,
} from './ipc_channels_definitions';

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.lastMessages]: {
		args: [sessionId: string];
		result: import('./agent_types').AgentHistoryMessage[];
	};
	[AgentChannels.clearMessages]: { args: [sessionId: string]; result: void };
	[AgentChannels.deleteSession]: { args: [sessionId: string]; result: void };
	[AgentChannels.getProvider]: {
		args: [];
		result: import('./provider_types').PublicProvider | undefined;
	};
	[AgentChannels.setProvider]: {
		args: [provider: import('./provider_types').PublicProvider];
		result: boolean;
	};
	[AgentChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[AgentChannels.setModelId]: {
		args: [modelId: string];
		result: boolean;
	};
	[AgentChannels.getModelOptions]: { args: []; result: Record<string, unknown> };
	[AgentChannels.setModelOptions]: {
		args: [options: Record<string, unknown>];
		result: Record<string, unknown>;
	};
	[AgentChannels.policyGet]: {
		args: [];
		result: import('../main/agent/policy/policy_types').PermissionsSchema;
	};
	[AgentChannels.policyPickDirectory]: {
		args: [];
		result: string | undefined;
	};
	[AgentChannels.policySetTool]: {
		args: [
			toolName: string,
			permission: import('../main/agent/policy/policy_types').ToolPermission,
		];
		result: import('../main/agent/policy/policy_types').PermissionsSchema;
	};
	[AgentChannels.policySetDirectories]: {
		args: [directories: import('../main/agent/policy/policy_types').DirectoryPermissions];
		result: import('../main/agent/policy/policy_types').PermissionsSchema;
	};
	[AgentChannels.policySetMode]: {
		args: [mode: import('./agent_types').AgentPermissionMode];
		result: import('../main/agent/policy/policy_types').PermissionsSchema;
	};
	[AgentChannels.policyReset]: {
		args: [];
		result: import('../main/agent/policy/policy_types').PermissionsSchema;
	};
	[AgentChannels.healthSettings]: {
		args: [];
		result: import('../main/agent/health/health_types').HealthSettings;
	};
	[AgentChannels.healthSaveSettings]: {
		args: [request: Partial<import('../main/agent/health/health_types').HealthSettings>];
		result: import('../main/agent/health/health_types').HealthSettings;
	};
	[AgentChannels.healthResetSettings]: {
		args: [];
		result: import('../main/agent/health/health_types').HealthSettings;
	};
	[AgentChannels.healthData]: { args: []; result: string };
	[AgentChannels.healthSaveData]: { args: [content: string]; result: string };
	[AgentChannels.ragIndex]: {
		args: [];
		result: import('../main/rag/rag_index').RagIndexResult;
	};
	[AgentChannels.ragGetConfiguration]: { args: []; result: import('./rag_types').RagConfiguration };
	[AgentChannels.ragSaveConfiguration]: {
		args: [configuration: import('./rag_types').RagConfiguration];
		result: import('./rag_types').RagConfiguration;
	};
	[AgentChannels.ragSearch]: {
		args: [query: string, topK?: number];
		result: import('../main/rag/rag_search').RagMatch[];
	};
	[AgentChannels.ragPickFolder]: { args: []; result: string | undefined };
}

export interface RecorderInvokeChannelMap {
	[RecorderChannels.microphone.start]: { args: [config: RecordConfig]; result: Recording };
	[RecorderChannels.microphone.stop]: { args: [id: string]; result: void };
	[RecorderChannels.microphone.cancel]: { args: [id: string]; result: void };
	[RecorderChannels.microphone.list]: { args: []; result: Recording[] };
	[RecorderChannels.microphone.complete]: { args: [result: RecorderCaptureResult]; result: void };
	[RecorderChannels.camera.start]: { args: [config: RecordConfig]; result: Recording };
	[RecorderChannels.camera.stop]: { args: [id: string]; result: void };
	[RecorderChannels.camera.cancel]: { args: [id: string]; result: void };
	[RecorderChannels.camera.list]: { args: []; result: Recording[] };
	[RecorderChannels.camera.complete]: { args: [result: RecorderCaptureResult]; result: void };
	[RecorderChannels.screen.start]: { args: [config: RecordConfig]; result: Recording };
	[RecorderChannels.screen.stop]: { args: [id: string]; result: void };
	[RecorderChannels.screen.cancel]: { args: [id: string]; result: void };
	[RecorderChannels.screen.list]: { args: []; result: Recording[] };
	[RecorderChannels.screen.complete]: { args: [result: RecorderCaptureResult]; result: void };
}

export interface RecorderEventChannelMap {
	[RecorderChannels.microphone.command]: { data: RecorderCommand };
	[RecorderChannels.microphone.event]: { data: Recording };
	[RecorderChannels.camera.command]: { data: RecorderCommand };
	[RecorderChannels.camera.event]: { data: Recording };
	[RecorderChannels.screen.command]: { data: RecorderCommand };
	[RecorderChannels.screen.event]: { data: Recording };
}

export interface TaskInvokeChannelMap {
	[TaskChannels.list]: { args: []; result: import('../main/tasks').TaskSchedule[] };
	[TaskChannels.getRuntime]: {
		args: [];
		result: import('../main/tasks').TaskRuntime | undefined;
	};
	[TaskChannels.setRuntime]: {
		args: [providerId: string, modelId: string];
		result: import('../main/tasks').TaskRuntime;
	};
}

export interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('./skills_types').SkillInfo[] };
	[SkillsChannels.load]: {
		args: [name: string];
		result: import('./skills_types').SkillLoadResult | undefined;
	};
	[SkillsChannels.import]: {
		args: [];
		result: import('./skills_types').SkillImportResult | undefined;
	};
	[SkillsChannels.download]: {
		args: [name: string];
		result: import('./skills_types').SkillDownloadResult | undefined;
	};
	[SkillsChannels.delete]: {
		args: [name: string];
		result: import('./skills_types').SkillDeleteResult;
	};
	[SkillsChannels.setEnabled]: {
		args: [id: string, enabled: boolean];
		result: import('./skills_types').SkillInfo;
	};
	[SkillsChannels.openRoot]: { args: []; result: void };
	[SkillsChannels.getRoot]: { args: []; result: string };
}

export interface McpInvokeChannelMap {
	[McpChannels.list]: { args: []; result: import('./mcp_types').McpSettings };
	[McpChannels.get]: { args: [id: string]; result: import('./mcp_types').McpSettings };
	[McpChannels.save]: {
		args: [input: import('./mcp_types').McpSettings];
		result: import('./mcp_types').McpSettings;
	};
	[McpChannels.upsert]: {
		args: [id: string, input: import('./mcp_types').McpData];
		result: import('./mcp_types').McpSettings;
	};
	[McpChannels.delete]: { args: [id: string]; result: void };
	[McpChannels.registry]: { args: []; result: import('./mcp_types').McpRegistry };
	[McpChannels.importLocal]: {
		args: [];
		result: import('./mcp_types').McpLocalImportResult | undefined;
	};
	[McpChannels.configureLocal]: {
		args: [id: string, input: import('./mcp_types').McpStdioData];
		result: import('./mcp_types').McpServerInfo;
	};
	[McpChannels.getRoot]: { args: []; result: string };
	[McpChannels.openRoot]: { args: []; result: void };
	[McpChannels.test]: {
		args: [id: string];
		result: import('./mcp_types').McpTestResult;
	};
	[McpChannels.oauthStart]: {
		args: [id: string];
		result: import('./mcp_types').McpOAuthStart;
	};
	[McpChannels.oauthFinish]: { args: [id: string, code: string]; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('./agent_types').AgentResponseEvent };
}

export interface AppInvokeChannelMap {
	[AppChannels.openAppDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openProvidersFolder]: {
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
		result: import('./app_types').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('./app_types').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('./app_types').MicrophonePermissionSettings;
	};
	[AppChannels.openSystemPreference]: {
		args: [pane: import('./app_types').SystemPreferencePaneId];
		result: void;
	};
	[AppChannels.getCameraPermission]: {
		args: [];
		result: import('./app_types').CameraPermissionSettings;
	};
	[AppChannels.setCameraEnabled]: {
		args: [enabled: boolean];
		result: import('./app_types').CameraPermissionSettings;
	};
	[AppChannels.requestCameraPermission]: {
		args: [];
		result: import('./app_types').CameraPermissionSettings;
	};
	[AppChannels.models]: {
		args: [];
		result: import('./model_types').CatalogModel[];
	};
	[AppChannels.databases]: {
		args: [];
		result: import('./provider_types').CatalogService[];
	};
	[AppChannels.storages]: {
		args: [];
		result: import('./provider_types').CatalogService[];
	};
	[AppChannels.webSearches]: {
		args: [];
		result: import('./provider_types').CatalogWebSearch[];
	};
	[AppChannels.mcps]: {
		args: [];
		result: import('./provider_types').CatalogService[];
	};
	[AppChannels.channels]: {
		args: [];
		result: import('./provider_types').CatalogService[];
	};
	[AppChannels.openVideo]: {
		args: [path: string];
		result: void;
	};
	[AppChannels.showImageContextMenu]: {
		args: [path: string];
		result: void;
	};
	[AppChannels.showVideoContextMenu]: {
		args: [path: string];
		result: void;
	};
	[AppChannels.showAudioContextMenu]: {
		args: [path: string];
		result: void;
	};
	[AppChannels.uploadProvider]: {
		args: [];
		result: string | null;
	};
	[AppChannels.getChannelsStatus]: {
		args: [type?: import('./channels_types').ChannelType];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
	[AppChannels.startTelegram]: {
		args: [];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
	[AppChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[AppChannels.restartTelegram]: {
		args: [];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
}

export interface ProviderInvokeChannelMap {
	[ProviderChannels.get]: {
		args: [id: string];
		result: import('./provider_types').StoredProvider | undefined;
	};
	[ProviderChannels.set]: {
		args: [
			provider: import('./provider_types').StoredProvider,
			kind?: import('./provider_types').StoredProviderKind,
		];
		result: import('./provider_types').StoredProvider;
	};
	[ProviderChannels.list]: {
		args: [];
		result: import('./provider_types').StoredProvider[];
	};
}

export type ProviderStoreInvokeChannelMap = ProviderInvokeChannelMap;

export interface SearchInvokeChannelMap {
	[SearchChannels.getSettings]: {
		args: [];
		result: import('./search_types').SearchSettings;
	};
	[SearchChannels.saveEngine]: {
		args: [
			engineId: import('./search_types').SearchEngineId,
			input: import('./search_types').SearchEngineInput,
		];
		result: import('./search_types').SearchSettings;
	};
	[SearchChannels.selectEngine]: {
		args: [engineId: import('./search_types').SearchEngineId];
		result: import('./search_types').SearchSettings;
	};
}

export interface WikiInvokeChannelMap {
	[WikiChannels.getSettings]: {
		args: [];
		result: import('./wiki_types').WikiSettings;
	};
	[WikiChannels.getStatus]: {
		args: [];
		result: import('./wiki_types').WikiStatus;
	};
	[WikiChannels.saveSettings]: {
		args: [settings: import('./wiki_types').WikiSettings];
		result: import('./wiki_types').WikiSettings;
	};
	[WikiChannels.run]: {
		args: [];
		result: import('./wiki_types').WikiRunResult;
	};
	[WikiChannels.cancel]: {
		args: [];
		result: boolean;
	};
	[WikiChannels.pickDirectory]: {
		args: [kind: 'source' | 'target'];
		result: string | undefined;
	};
	[WikiChannels.openDirectory]: {
		args: [kind: 'source' | 'target'];
		result: void;
	};
}

export interface StorageInvokeChannelMap {
	[StorageChannels.getStorages]: {
		args: [];
		result: import('./storage_types').StorageConfig[];
	};
	[StorageChannels.getStorageConfiguration]: {
		args: [];
		result: import('./storage_types').StorageConfiguration;
	};
	[StorageChannels.saveStorageConfiguration]: {
		args: [configuration: import('./storage_types').StorageConfiguration];
		result: import('./storage_types').StorageConfiguration;
	};
	[StorageChannels.saveStorageConfig]: {
		args: [config: import('./storage_types').StorageConfig];
		result: import('./storage_types').StorageConfig;
	};
	[StorageChannels.deleteStorageConfig]: {
		args: [id: string];
		result: void;
	};
	[StorageChannels.testConnection]: {
		args: [config: import('./storage_types').StorageConfig];
		result: import('./storage_types').StorageTestResult;
	};
	[StorageChannels.listObjects]: {
		args: [id: string, prefix?: string];
		result: import('./storage_types').StorageObjectInfo[];
	};
	[StorageChannels.putObject]: {
		args: [id: string, key: string, data: Uint8Array, contentType?: string];
		result: void;
	};
	[StorageChannels.getObject]: {
		args: [id: string, key: string];
		result: Uint8Array;
	};
	[StorageChannels.deleteObject]: {
		args: [id: string, key: string];
		result: void;
	};
	[StorageChannels.sync]: {
		args: [id: string, localDir: string, prefix?: string];
		result: import('./storage_types').StorageSyncResult;
	};
	[StorageChannels.syncFolders]: {
		args: [];
		result: import('./storage_types').StorageSyncFolder[];
	};
	[StorageChannels.pickFolders]: {
		args: [];
		result: string[];
	};
	[StorageChannels.push]: {
		args: [id: string];
		result: import('./storage_types').StoragePushResult;
	};
	[StorageChannels.pull]: {
		args: [id: string];
		result: import('./storage_types').StoragePullResult;
	};
}

export interface DatabaseInvokeChannelMap {
	[DatabaseChannels.getConfiguration]: {
		args: [];
		result: import('./database_types').DatabaseConfiguration;
	};
	[DatabaseChannels.saveConfiguration]: {
		args: [configuration: import('./database_types').DatabaseConfiguration];
		result: import('./database_types').DatabaseConfiguration;
	};
}

export interface EmbeddingInvokeChannelMap {
	[EmbeddingChannels.createEmbedding]: {
		args: [request: EmbeddingRequest];
		result: EmbeddingResult;
	};
	[EmbeddingChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[EmbeddingChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[EmbeddingChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[EmbeddingChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
}

export interface ImageInvokeChannelMap {
	[ImageChannels.createImage]: {
		args: [request: ImageRequest];
		result: ImageResult;
	};
	[ImageChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[ImageChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[ImageChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[ImageChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
	[ImageChannels.getOptions]: { args: []; result: Record<string, unknown> };
	[ImageChannels.setOptions]: {
		args: [options: Record<string, unknown>];
		result: Record<string, unknown>;
	};
}

export interface SoundInvokeChannelMap {
	[SoundChannels.createSound]: {
		args: [request: SoundRequest];
		result: SoundResult;
	};
	[SoundChannels.listSounds]: {
		args: [];
		result: SoundFile[];
	};
	[SoundChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[SoundChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[SoundChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[SoundChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
	[SoundChannels.getOptions]: { args: []; result: Record<string, unknown> };
	[SoundChannels.setOptions]: {
		args: [options: Record<string, unknown>];
		result: Record<string, unknown>;
	};
}

export interface VideoInvokeChannelMap {
	[VideoChannels.createVideo]: {
		args: [request: VideoRequest];
		result: VideoResult;
	};
	[VideoChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[VideoChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[VideoChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[VideoChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
	[VideoChannels.getOptions]: { args: []; result: Record<string, unknown> };
	[VideoChannels.setOptions]: {
		args: [options: Record<string, unknown>];
		result: Record<string, unknown>;
	};
}

export interface TextInvokeChannelMap {
	[TextChannels.generateText]: {
		args: [request: TextRequest];
		result: string;
	};
	[TextChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[TextChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[TextChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[TextChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
}

export interface SpeechInvokeChannelMap {
	[SpeechChannels.synthesize]: {
		args: [request: SpeechSynthesisRequest];
		result: SpeechSynthesisResult;
	};
	[SpeechChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[SpeechChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[SpeechChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[SpeechChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
}

export interface SttInvokeChannelMap {
	[SttChannels.transcribe]: {
		args: [request: SttTranscriptionRequest];
		result: SttTranscriptionResult;
	};
	[SttChannels.startRealtime]: {
		args: [request: SttRealtimeStartRequest | undefined];
		result: SttRealtimeSession;
	};
	[SttChannels.appendRealtimeAudio]: {
		args: [sessionId: string, audio: string];
		result: void;
	};
	[SttChannels.finishRealtime]: {
		args: [sessionId: string];
		result: void;
	};
	[SttChannels.cancelRealtime]: {
		args: [sessionId: string];
		result: void;
	};
	[SttChannels.getSelection]: {
		args: [mode?: SttSelectionMode];
		result: SttModelSelection | undefined;
	};
	[SttChannels.listProviders]: {
		args: [];
		result: PublicProvider[];
	};
	[SttChannels.listModels]: {
		args: [providerId: string];
		result: ProviderModel[];
	};
	[SttChannels.saveSelection]: {
		args: [providerId: string, modelId: string, mode?: SttSelectionMode];
		result: boolean;
	};
	[SttChannels.getProviderId]: {
		args: [];
		result: string | undefined;
	};
	[SttChannels.setProviderId]: {
		args: [providerId: string];
		result: void;
	};
	[SttChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[SttChannels.setModelId]: {
		args: [modelId: string];
		result: void;
	};
}

export interface SttEventChannelMap {
	[SttChannels.realtimeEvent]: { data: SttRealtimeEvent };
}

export interface ExtensionsInvokeChannelMap {
	[ExtensionChannels.list]: { args: []; result: import('./extension_types').Extension[] };
	[ExtensionChannels.open]: { args: [extensionId: string]; result: void };
}

export interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

export interface WindowSendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

export interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

export interface InvokeChannelMap
	extends
		AppInvokeChannelMap,
		AgentInvokeChannelMap,
		RecorderInvokeChannelMap,
		TaskInvokeChannelMap,
		SkillsInvokeChannelMap,
		McpInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		SearchInvokeChannelMap,
		WikiInvokeChannelMap,
		StorageInvokeChannelMap,
		DatabaseInvokeChannelMap,
		WindowInvokeChannelMap,
		EmbeddingInvokeChannelMap,
		ImageInvokeChannelMap,
		SoundInvokeChannelMap,
		SpeechInvokeChannelMap,
		SttInvokeChannelMap,
		TextInvokeChannelMap,
		VideoInvokeChannelMap,
		ExtensionsInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface AppEventChannelMap {
	[AppChannels.modelsChanged]: { data: void };
	[AppChannels.channelsStatusChanged]: { data: import('./channels_types').ChannelStatusEvent };
}

export interface EventChannelMap
	extends
		AppEventChannelMap,
		AgentEventChannelMap,
		RecorderEventChannelMap,
		WindowEventChannelMap,
		SttEventChannelMap {}
