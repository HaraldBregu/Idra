import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from '../shared/ipc_types';
import {
	WindowChannels,
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ImageChannels,
	ProviderStoreChannels,
	SpeechChannels,
	SttChannels,
	TextChannels,
} from '../shared/ipc_channels_definitions';
import type {
	AppApi,
	AgentApi,
	ChannelsApi,
	ImageApi,
	ProviderApi,
	TranscribeApi,
	VoiceApi,
	WindowApi,
} from './index.d';
import type { PublicProvider } from '../shared';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentToolPermissionDecision,
	ModelReasoningEffort,
} from '../shared/agent_types';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared';
import type { ChannelCatalogEntry } from '../shared';
import type { Provider } from '../shared/providers_types';
import { normalizeSpeechSynthesisRequest } from '../shared/speech_types';
import {
	normalizeSttRealtimeAudioChunk,
	normalizeSttRealtimeStartRequest,
	normalizeSttTranscriptionRequest,
} from '../shared/stt_transcription';
import { McpOAuthStart, McpSettings } from '../shared/mcp_types';
import type { HealthSettings } from '../main/agent/health/health_types';

const MODEL_REASONING_EFFORTS: readonly ModelReasoningEffort[] = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
];

function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

function isSttRealtimeSessionId(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const items = value.map(optionalTrimmedString).filter((item): item is string => Boolean(item));
	return items.length > 0 ? items : undefined;
}

function normalizeAgentSendRuntimeOptions(
	options?: Record<string, unknown>
): Record<string, unknown> | undefined {
	if (!options) return undefined;
	const normalized: Record<string, unknown> = {
		...(optionalTrimmedString(options.runId)
			? { runId: optionalTrimmedString(options.runId) }
			: {}),
		...(optionalTrimmedString(options.sessionId)
			? { sessionId: optionalTrimmedString(options.sessionId) }
			: {}),
		...(optionalTrimmedString(options.agentRuntime)
			? { agentRuntime: optionalTrimmedString(options.agentRuntime) }
			: {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model)
			? { model: optionalTrimmedString(options.model) }
			: {}),
		...(isModelReasoningEffort(options.effort) ? { effort: options.effort } : {}),
		...(typeof options.lightContext === 'boolean' ? { lightContext: options.lightContext } : {}),
		...(optionalStringList(options.toolsAllow)
			? { toolsAllow: optionalStringList(options.toolsAllow) }
			: {}),
		...(optionalStringList(options.toolsDeny)
			? { toolsDeny: optionalStringList(options.toolsDeny) }
			: {}),
	};
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function sendAgent(
	message: string,
	options?: Record<string, unknown>,
	onEvent?: (event: AgentResponseEvent) => void
): Promise<string> {
	const runId = optionalTrimmedString(options?.runId) || crypto.randomUUID();
	const runtimeOptions = normalizeAgentSendRuntimeOptions({ ...options, runId });

	const offResponse = typedOn(AgentChannels.response, (event: AgentResponseEvent) => {
		if (event.runId !== runId) return;
		onEvent?.(event);
	});

	return (
		runtimeOptions
			? typedInvokeUnwrap<string>(AgentChannels.send, message, runtimeOptions)
			: typedInvokeUnwrap<string>(AgentChannels.send, message)
	).finally(offResponse);
}

const win: WindowApi = {
	minimize: (): void => {
		typedSend(WindowChannels.minimize);
	},
	close: (): void => {
		typedSend(WindowChannels.close);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	isFullScreen: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isFullScreen);
	},
	onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.fullScreenChange, callback);
	},
} satisfies WindowApi;

export const agent: AgentApi = {
	send: (
		message: string,
		options?: Record<string, unknown>,
		onEvent?: (event: AgentResponseEvent) => void
	): Promise<string> => {
		return sendAgent(message, options, onEvent);
	},
	cancel: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.cancel);
	},
	respondToolPermission: (
		toolCallId: string,
		decision: AgentToolPermissionDecision
	): Promise<boolean> => {
		const normalizedToolCallId = optionalTrimmedString(toolCallId);
		if (!normalizedToolCallId) throw new Error('Invalid tool call id.');
		return typedInvokeUnwrap(
			AgentChannels.respondToolPermission,
			normalizedToolCallId,
			decision
		);
	},
	getLastMessages: (sessionId: string): Promise<AgentHistoryMessage[]> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.lastMessages, normalizedSessionId);
	},
	clearMessages: (sessionId: string): Promise<void> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.clearMessages, normalizedSessionId);
	},
	getProvider: (): Promise<PublicProvider | undefined> => {
		return typedInvokeUnwrap(AgentChannels.getProvider);
	},
	setProvider: (provider: PublicProvider): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.setProvider, provider);
	},
	getModelId: (): Promise<string | undefined> => {
		return typedInvokeUnwrap(AgentChannels.getModelId);
	},
	setModelId: (modelId: string): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.setModelId, modelId);
	},
	skillsList: () => {
		return typedInvokeUnwrap(AgentChannels.skillsList);
	},
	skillsLoad: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsLoad, name);
	},
	skillsImport: () => {
		return typedInvokeUnwrap(AgentChannels.skillsImport);
	},
	skillsDownload: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsDownload, name);
	},
	skillsDelete: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsDelete, name);
	},
	skillsSetEnabled: (id: string, enabled: boolean) => {
		return typedInvokeUnwrap(AgentChannels.skillsSetEnabled, id, enabled);
	},
	skillsOpenRoot: () => {
		return typedInvokeUnwrap(AgentChannels.skillsOpenRoot);
	},
	skillsGetRoot: (): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.skillsGetRoot);
	},
	cronList: () => {
		return typedInvokeUnwrap(AgentChannels.cronList);
	},
	cronGetRuntime: () => {
		return typedInvokeUnwrap(AgentChannels.cronGetRuntime);
	},
	cronSetRuntime: (providerId: string, modelId: string) => {
		return typedInvokeUnwrap(AgentChannels.cronSetRuntime, providerId, modelId);
	},
	healthGetSettings: (): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthSettings);
	},
	healthSaveSettings: (settings: Partial<HealthSettings>): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthSaveSettings, settings);
	},
	healthResetSettings: (): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthResetSettings);
	},
	healthGetData: (): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.healthData);
	},
	healthSaveData: (content: string): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.healthSaveData, content);
	},
	mcpList: (): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpList);
	},
	mcpGet: (id: string): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpGet, id);
	},
	mcpSave: (input: McpSettings): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpSave, input);
	},
	mcpDelete: (id: string): Promise<void> => {
		return typedInvokeUnwrap<void>(AgentChannels.mcpDelete, id);
	},
	mcpOauthStart: (id: string): Promise<McpOAuthStart> => {
		return typedInvokeUnwrap<McpOAuthStart>(AgentChannels.mcpOauthStart, id);
	},
	mcpOauthFinish: (id: string, code: string): Promise<void> => {
		return typedInvokeUnwrap<void>(AgentChannels.mcpOauthFinish, id, code);
	},
} satisfies AgentApi;

export const app: AppApi = {
	openAppDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openAppDataFolder);
	},
	openExternalUrl: (url: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openExternalUrl, url);
	},
	setTrayEnabled: (enabled: boolean): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled);
	},
	getTrayEnabled: (): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.getTrayEnabled);
	},
	getMicrophonePermission: () => {
		return typedInvokeUnwrap(AppChannels.getMicrophonePermission);
	},
	setMicrophoneEnabled: (enabled: boolean) => {
		return typedInvokeUnwrap(AppChannels.setMicrophoneEnabled, enabled);
	},
	requestMicrophonePermission: () => {
		return typedInvokeUnwrap(AppChannels.requestMicrophonePermission);
	},
	openSystemPreference: (pane) => {
		return typedInvokeUnwrap(AppChannels.openSystemPreference, pane);
	},
	getCameraPermission: () => {
		return typedInvokeUnwrap(AppChannels.getCameraPermission);
	},
	setCameraEnabled: (enabled: boolean) => {
		return typedInvokeUnwrap(AppChannels.setCameraEnabled, enabled);
	},
	requestCameraPermission: () => {
		return typedInvokeUnwrap(AppChannels.requestCameraPermission);
	},
};

export const provider: ProviderApi = {
	get: (id: string): Promise<Provider | undefined> => {
		return typedInvokeUnwrap(ProviderStoreChannels.get, id);
	},
	set: (id: string, provider: Provider): Promise<Provider> => {
		return typedInvokeUnwrap(ProviderStoreChannels.set, id, provider);
	},
};

export const transcribe: TranscribeApi = {
	transcribe: (request) => {
		return typedInvokeUnwrap(SttChannels.transcribe, normalizeSttTranscriptionRequest(request));
	},
	startRealtime: (request) => {
		return typedInvokeUnwrap(SttChannels.startRealtime, normalizeSttRealtimeStartRequest(request));
	},
	appendRealtimeAudio: (sessionId, audio) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(
			SttChannels.appendRealtimeAudio,
			sessionId,
			normalizeSttRealtimeAudioChunk(audio)
		);
	},
	finishRealtime: (sessionId) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(SttChannels.finishRealtime, sessionId);
	},
	cancelRealtime: (sessionId) => {
		if (!isSttRealtimeSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text realtime session id.');
		}
		return typedInvokeUnwrap(SttChannels.cancelRealtime, sessionId);
	},
	onRealtimeEvent: (callback) => {
		return typedOn(SttChannels.realtimeEvent, callback);
	},
	getSelection: (mode) => {
		return typedInvokeUnwrap(SttChannels.getSelection, mode);
	},
	listProviders: () => {
		return typedInvokeUnwrap(SttChannels.listProviders);
	},
	listModels: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		return typedInvokeUnwrap(SttChannels.listModels, normalizedProviderId);
	},
	saveSelection: (providerId, modelId, mode) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		if (!normalizedModelId) throw new Error('Invalid speech-to-text model id.');
		return typedInvokeUnwrap(
			SttChannels.saveSelection,
			normalizedProviderId,
			normalizedModelId,
			mode
		);
	},
	getProviderId: () => {
		return typedInvokeUnwrap(SttChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid transcribe provider id.');
		return typedInvokeUnwrap(SttChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(SttChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid transcribe model id.');
		return typedInvokeUnwrap(SttChannels.setModelId, normalizedModelId);
	},
};

export const voice: VoiceApi = {
	synthesize: (request) => {
		return typedInvokeUnwrap(SpeechChannels.synthesize, normalizeSpeechSynthesisRequest(request));
	},
	getProviderId: () => {
		return typedInvokeUnwrap(SpeechChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid voice provider id.');
		return typedInvokeUnwrap(SpeechChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(SpeechChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid voice model id.');
		return typedInvokeUnwrap(SpeechChannels.setModelId, normalizedModelId);
	},
};

export const image: ImageApi = {
	createImage: (request) => {
		const prompt = optionalTrimmedString(request?.prompt);
		if (!prompt) throw new Error('Invalid image prompt.');
		const providerId = optionalTrimmedString(request?.providerId);
		const modelId = optionalTrimmedString(request?.modelId);
		return typedInvokeUnwrap(ImageChannels.createImage, {
			prompt,
			...(providerId ? { providerId } : {}),
			...(modelId ? { modelId } : {}),
		});
	},
	getProviderId: () => {
		return typedInvokeUnwrap(ImageChannels.getProviderId);
	},
	setProviderId: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid image provider id.');
		return typedInvokeUnwrap(ImageChannels.setProviderId, normalizedProviderId);
	},
	getModelId: () => {
		return typedInvokeUnwrap(ImageChannels.getModelId);
	},
	setModelId: (modelId) => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid image model id.');
		return typedInvokeUnwrap(ImageChannels.setModelId, normalizedModelId);
	},
};

export const channels: ChannelsApi = {
	listCatalog: (): Promise<ChannelCatalogEntry[]> => {
		return typedInvokeUnwrap(ChannelsChannels.listCatalog);
	},
	getConfig: (): Promise<Channel> => {
		return typedInvokeUnwrap(ChannelsChannels.getConfig);
	},
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	): Promise<Channel[TKey]> => {
		return typedInvokeUnwrap(ChannelsChannels.saveChannelConfig, type, config) as Promise<
			Channel[TKey]
		>;
	},
	getStatus: (type?: ChannelType): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.getStatus, type);
	},
	startTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.startTelegram);
	},
	stopTelegram: (): Promise<void> => {
		return typedInvokeUnwrap(ChannelsChannels.stopTelegram);
	},
	restartTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.restartTelegram);
	},
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void): (() => void) => {
		return typedOn(ChannelsChannels.statusChanged, callback);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('provider', provider);
		contextBridge.exposeInMainWorld('transcribe', transcribe);
		contextBridge.exposeInMainWorld('voice', voice);
		contextBridge.exposeInMainWorld('image', image);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
	// @ts-ignore (define in dts)
	globalThis.agent = agent;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.provider = provider;
	// @ts-ignore (define in dts)
	globalThis.transcribe = transcribe;
	// @ts-ignore (define in dts)
	globalThis.voice = voice;
	// @ts-ignore (define in dts)
	globalThis.image = image;
}
