import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from '../shared/ipc/types';
import {
	WindowChannels,
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ConnectorsChannels,
	ProviderStoreChannels,
	SkillsChannels,
	SttChannels,
} from '../shared/ipc/ipc-channels';
import type {
	AppApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	ProviderApi,
	SkillsApi,
	SttApi,
	WindowApi,
} from './index.d';
import type { PublicProvider } from '../shared/providers';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	ModelReasoningEffort,
} from '../shared/agent/types';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type { Provider } from '../shared/providers/types';
import {
	normalizeSttRealtimeAudioChunk,
	normalizeSttRealtimeStartRequest,
	normalizeSttTranscriptionRequest,
} from '../shared/stt/transcription';
import { McpSettings } from '../shared/mcp/mcp';

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

export const skills: SkillsApi = {
	list: () => {
		return typedInvokeUnwrap(SkillsChannels.list);
	},
	importSkill: () => {
		return typedInvokeUnwrap(SkillsChannels.import);
	},
	downloadSkill: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.download, name);
	},
	delete: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.delete, name);
	},
	getRoot: (): Promise<string> => {
		return typedInvokeUnwrap(SkillsChannels.getRoot);
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

export const stt: SttApi = {
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
	getSelection: () => {
		return typedInvokeUnwrap(SttChannels.getSelection);
	},
	listProviders: () => {
		return typedInvokeUnwrap(SttChannels.listProviders);
	},
	listModels: (providerId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		return typedInvokeUnwrap(SttChannels.listModels, normalizedProviderId);
	},
	saveSelection: (providerId, modelId) => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedProviderId) throw new Error('Invalid speech-to-text provider id.');
		if (!normalizedModelId) throw new Error('Invalid speech-to-text model id.');
		return typedInvokeUnwrap(SttChannels.saveSelection, normalizedProviderId, normalizedModelId);
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

export const connectors: ConnectorsApi = {
	list: (): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(ConnectorsChannels.list);
	},
	get: (id: string): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(ConnectorsChannels.get, id);
	},
	save: (input: McpSettings): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(ConnectorsChannels.save, input);
	},
	delete: (id: string): Promise<void> => {
		return typedInvokeUnwrap<void>(ConnectorsChannels.delete, id);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('provider', provider);
		contextBridge.exposeInMainWorld('stt', stt);
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
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.provider = provider;
	// @ts-ignore (define in dts)
	globalThis.stt = stt;
}
