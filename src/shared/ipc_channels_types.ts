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
import type { PublicProvider } from './providers_definitions';
import type { ProviderModel } from './provider_models_types';
import type { ImageRequest, ImageResult } from './image_types';
import {
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ImageChannels,
	ProviderChannels,
	SpeechChannels,
	SttChannels,
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
	[AgentChannels.getProvider]: {
		args: [];
		result: import('./providers_definitions').PublicProvider | undefined;
	};
	[AgentChannels.setProvider]: {
		args: [provider: import('./providers_definitions').PublicProvider];
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
	[AgentChannels.cronList]: { args: []; result: import('../main/agent/cron').CronSchedule[] };
	[AgentChannels.cronGetRuntime]: {
		args: [];
		result: import('../main/agent/cron').CronRuntime | undefined;
	};
	[AgentChannels.cronSetRuntime]: {
		args: [providerId: string, modelId: string];
		result: import('../main/agent/cron').CronRuntime;
	};
	[AgentChannels.skillsList]: { args: []; result: import('./skills_types').SkillInfo[] };
	[AgentChannels.skillsLoad]: {
		args: [name: string];
		result: import('./skills_types').SkillLoadResult | undefined;
	};
	[AgentChannels.skillsImport]: { args: []; result: import('./skills_types').SkillImportResult | undefined };
	[AgentChannels.skillsDownload]: {
		args: [name: string];
		result: import('./skills_types').SkillDownloadResult | undefined;
	};
	[AgentChannels.skillsDelete]: { args: [name: string]; result: import('./skills_types').SkillDeleteResult };
	[AgentChannels.skillsSetEnabled]: {
		args: [id: string, enabled: boolean];
		result: import('./skills_types').SkillInfo;
	};
	[AgentChannels.skillsOpenRoot]: { args: []; result: void };
	[AgentChannels.skillsGetRoot]: { args: []; result: string };
	[AgentChannels.healthSettings]: { args: []; result: import('../main/agent/health/health_types').HealthSettings };
	[AgentChannels.healthSaveSettings]: {
		args: [request: Partial<import('../main/agent/health/health_types').HealthSettings>];
		result: import('../main/agent/health/health_types').HealthSettings;
	};
	[AgentChannels.healthResetSettings]: { args: []; result: import('../main/agent/health/health_types').HealthSettings };
	[AgentChannels.healthData]: { args: []; result: string };
	[AgentChannels.healthSaveData]: { args: [content: string]; result: string };
	[AgentChannels.mcpList]: { args: []; result: import('./mcp_types').McpSettings };
	[AgentChannels.mcpGet]: { args: [id: string]; result: import('./mcp_types').McpSettings };
	[AgentChannels.mcpSave]: { args: [input: import('./mcp_types').McpSettings]; result: import('./mcp_types').McpSettings };
	[AgentChannels.mcpDelete]: { args: [id: string]; result: void };
	[AgentChannels.mcpOauthStart]: { args: [id: string]; result: import('./mcp_types').McpOAuthStart };
	[AgentChannels.mcpOauthFinish]: { args: [id: string, code: string]; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('./agent_types').AgentResponseEvent };
}

export interface AppInvokeChannelMap {
	[AppChannels.openAppDataFolder]: {
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
}

export interface ChannelsInvokeChannelMap {
	[ChannelsChannels.listCatalog]: {
		args: [];
		result: import('./channels_types').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('./channels_types').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('./channels_types').ChannelType];
		result: import('./channels_types').Channel[import('./channels_types').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('./channels_types').ChannelType,
			config: import('./channels_types').Channel[import('./channels_types').ChannelType],
		];
		result: import('./channels_types').Channel[import('./channels_types').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('./channels_types').ChannelType];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('./channels_types').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('./channels_types').TelegramChannelProperties];
		result: import('./channels_types').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('./channels_types').ChannelStatusEvent | undefined;
	};
}

export interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels_types').ChannelStatusEvent };
}

export interface ProviderInvokeChannelMap {
	[ProviderChannels.get]: {
		args: [id: string];
		result: import('./providers_types').Provider | undefined;
	};
	[ProviderChannels.set]: {
		args: [id: string, provider: import('./providers_types').Provider];
		result: import('./providers_types').Provider;
	};
}

export type ProviderStoreInvokeChannelMap = ProviderInvokeChannelMap;

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
	extends AppInvokeChannelMap,
		AgentInvokeChannelMap,
		ProviderStoreInvokeChannelMap,
		WindowInvokeChannelMap,
		ChannelsInvokeChannelMap,
		ImageInvokeChannelMap,
		SpeechInvokeChannelMap,
		SttInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		SttEventChannelMap {}
