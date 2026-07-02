import type { SpeechSynthesisRequest, SpeechSynthesisResult } from './speech.types';
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
import type { ProviderModel } from './providers_models.types';
import {
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ProviderChannels,
	SpeechChannels,
	SttChannels,
	WindowChannels,
} from './ipc_channels.definitions';

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.lastMessages]: {
		args: [sessionId: string];
		result: import('./agent.types').AgentHistoryMessage[];
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
	[AgentChannels.skillsList]: { args: []; result: import('./skills.types').SkillInfo[] };
	[AgentChannels.skillsLoad]: {
		args: [name: string];
		result: import('./skills.types').SkillLoadResult | undefined;
	};
	[AgentChannels.skillsImport]: { args: []; result: import('./skills.types').SkillImportResult | undefined };
	[AgentChannels.skillsDownload]: {
		args: [name: string];
		result: import('./skills.types').SkillDownloadResult | undefined;
	};
	[AgentChannels.skillsDelete]: { args: [name: string]; result: import('./skills.types').SkillDeleteResult };
	[AgentChannels.skillsSetEnabled]: {
		args: [id: string, enabled: boolean];
		result: import('./skills.types').SkillInfo;
	};
	[AgentChannels.skillsOpenRoot]: { args: []; result: void };
	[AgentChannels.skillsGetRoot]: { args: []; result: string };
	[AgentChannels.healthSettings]: { args: []; result: import('../main/agent/health/health-types').HealthSettings };
	[AgentChannels.healthSaveSettings]: {
		args: [request: Partial<import('../main/agent/health/health-types').HealthSettings>];
		result: import('../main/agent/health/health-types').HealthSettings;
	};
	[AgentChannels.healthResetSettings]: { args: []; result: import('../main/agent/health/health-types').HealthSettings };
	[AgentChannels.mcpList]: { args: []; result: import('./mcp').McpSettings };
	[AgentChannels.mcpGet]: { args: [id: string]; result: import('./mcp').McpSettings };
	[AgentChannels.mcpSave]: { args: [input: import('./mcp').McpSettings]; result: import('./mcp').McpSettings };
	[AgentChannels.mcpDelete]: { args: [id: string]; result: void };
	[AgentChannels.mcpOauthStart]: { args: [id: string]; result: import('./mcp').McpOAuthStart };
	[AgentChannels.mcpOauthFinish]: { args: [id: string, code: string]; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('./agent.types').AgentResponseEvent };
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
		result: import('./app.types').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('./app.types').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('./app.types').MicrophonePermissionSettings;
	};
	[AppChannels.openSystemPreference]: {
		args: [pane: import('./app.types').SystemPreferencePaneId];
		result: void;
	};
	[AppChannels.getCameraPermission]: {
		args: [];
		result: import('./app.types').CameraPermissionSettings;
	};
	[AppChannels.setCameraEnabled]: {
		args: [enabled: boolean];
		result: import('./app.types').CameraPermissionSettings;
	};
	[AppChannels.requestCameraPermission]: {
		args: [];
		result: import('./app.types').CameraPermissionSettings;
	};
}

export interface ChannelsInvokeChannelMap {
	[ChannelsChannels.listCatalog]: {
		args: [];
		result: import('./channels.types').ChannelCatalogEntry[];
	};
	[ChannelsChannels.getConfig]: {
		args: [];
		result: import('./channels.types').Channel;
	};
	[ChannelsChannels.getChannelConfig]: {
		args: [type: import('./channels.types').ChannelType];
		result: import('./channels.types').Channel[import('./channels.types').ChannelType];
	};
	[ChannelsChannels.saveChannelConfig]: {
		args: [
			type: import('./channels.types').ChannelType,
			config: import('./channels.types').Channel[import('./channels.types').ChannelType],
		];
		result: import('./channels.types').Channel[import('./channels.types').ChannelType];
	};
	[ChannelsChannels.getStatus]: {
		args: [type?: import('./channels.types').ChannelType];
		result: import('./channels.types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('./channels.types').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('./channels.types').TelegramChannelProperties];
		result: import('./channels.types').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('./channels.types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('./channels.types').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('./channels.types').ChannelStatusEvent | undefined;
	};
}

export interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels.types').ChannelStatusEvent };
}

export interface ProviderInvokeChannelMap {
	[ProviderChannels.get]: {
		args: [id: string];
		result: import('./providers.types').Provider | undefined;
	};
	[ProviderChannels.set]: {
		args: [id: string, provider: import('./providers.types').Provider];
		result: import('./providers.types').Provider;
	};
}

export type ProviderStoreInvokeChannelMap = ProviderInvokeChannelMap;

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
		SpeechInvokeChannelMap,
		SttInvokeChannelMap {}

export interface SendChannelMap extends WindowSendChannelMap {}

export interface EventChannelMap
	extends AgentEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap,
		SttEventChannelMap {}
