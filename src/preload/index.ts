import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from '../shared/ipc/types';
import {
	WindowChannels,
	AgentChannels,
	AgentStoreChannels,
	AppChannels,
	ChannelsChannels,
	ConnectorsChannels,
	ProviderStoreChannels,
	RealtimeTranscriptionChannels,
	CronChannels,
	SkillsChannels,
} from '../shared/ipc/ipc-channels';
import type {
	AppApi,
	AgentStoreApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
	RealtimeTranscriptionApi,
	ProviderStoreApi,
	SkillsApi,
	WindowApi,
} from './index.d';
import type { PublicProvider } from '../shared/providers';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/app/cron';
import type { RealtimeTranscriptionEvent, RealtimeTranscriptionSession } from './index.d';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	ModelReasoningEffort,
} from '../shared/agent/types';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type { ConnectorRecord } from './index.d';
import type { Provider } from '../shared/providers/types';

const MODEL_REASONING_EFFORTS: readonly ModelReasoningEffort[] = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
];
const REALTIME_TRANSCRIPTION_MAX_LANGUAGE_LENGTH = 35;
const REALTIME_TRANSCRIPTION_MAX_AUDIO_CHARS = 256 * 1024;

function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

function normalizeRealtimeTranscriptionStartRequest(
	request: unknown
): Parameters<RealtimeTranscriptionApi['start']>[0] {
	if (request === undefined) return undefined;
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid realtime transcription start request.');
	}

	const language = (request as { language?: unknown }).language;
	if (language === undefined) return undefined;
	if (typeof language !== 'string') {
		throw new Error('Invalid realtime transcription language.');
	}

	const trimmed = language.trim();
	if (!trimmed) return undefined;
	if (trimmed.length > REALTIME_TRANSCRIPTION_MAX_LANGUAGE_LENGTH) {
		throw new Error('Realtime transcription language is too long.');
	}

	return { language: trimmed };
}

function isRealtimeTranscriptionSessionId(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isRealtimeTranscriptionAudioChunk(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= REALTIME_TRANSCRIPTION_MAX_AUDIO_CHARS &&
		/^[A-Za-z0-9+/]+={0,2}$/.test(value)
	);
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

function sendAgentV2(
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
			? typedInvokeUnwrap<string>(AgentChannels.sendV2, message, runtimeOptions)
			: typedInvokeUnwrap<string>(AgentChannels.sendV2, message)
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
	send_v2: (
		message: string,
		options?: Record<string, unknown>,
		onEvent?: (event: AgentResponseEvent) => void
	): Promise<string> => {
		return sendAgentV2(message, options, onEvent);
	},
	cancel: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.cancel);
	},
	getLastMessages: (sessionId: string): Promise<AgentHistoryMessage[]> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.lastMessages, normalizedSessionId);
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

export const realtimeTranscription: RealtimeTranscriptionApi = {
	start: (request) => {
		return typedInvokeUnwrap<RealtimeTranscriptionSession>(
			RealtimeTranscriptionChannels.start,
			normalizeRealtimeTranscriptionStartRequest(request)
		);
	},
	appendAudio: (sessionId: string, audio: string): void => {
		if (!isRealtimeTranscriptionSessionId(sessionId)) {
			throw new Error('Invalid realtime transcription session id.');
		}
		if (!isRealtimeTranscriptionAudioChunk(audio)) {
			throw new Error('Invalid realtime transcription audio chunk.');
		}
		typedSend(RealtimeTranscriptionChannels.appendAudio, sessionId, audio);
	},
	finish: (sessionId: string): Promise<void> => {
		if (!isRealtimeTranscriptionSessionId(sessionId)) {
			throw new Error('Invalid realtime transcription session id.');
		}
		return typedInvokeUnwrap(RealtimeTranscriptionChannels.finish, sessionId);
	},
	cancel: (sessionId: string): Promise<void> => {
		if (!isRealtimeTranscriptionSessionId(sessionId)) {
			throw new Error('Invalid realtime transcription session id.');
		}
		return typedInvokeUnwrap(RealtimeTranscriptionChannels.cancel, sessionId);
	},
	onEvent: (callback): (() => void) => {
		return typedOn(RealtimeTranscriptionChannels.event, (event) => {
			callback(event as RealtimeTranscriptionEvent);
		});
	},
};

export const cron: CronApi = {
	pauseSchedule: (scheduleId: string): Promise<void> => {
		return typedInvokeUnwrap(CronChannels.pauseSchedule, scheduleId);
	},
	resumeSchedule: (scheduleId: string): Promise<void> => {
		return typedInvokeUnwrap(CronChannels.resumeSchedule, scheduleId);
	},
	deleteSchedule: (scheduleId: string): Promise<void> => {
		return typedInvokeUnwrap(CronChannels.deleteSchedule, scheduleId);
	},
	listSchedules: (filter?: CronScheduleFilter): Promise<CronSchedule[]> => {
		return typedInvokeUnwrap(CronChannels.listSchedules, filter);
	},
	getSchedule: (scheduleId: string): Promise<CronSchedule> => {
		return typedInvokeUnwrap(CronChannels.getSchedule, scheduleId);
	},
	runNow: (scheduleId: string): Promise<CronScheduledTask> => {
		return typedInvokeUnwrap(CronChannels.runNow, scheduleId);
	},
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void): (() => void) => {
		return typedOn(CronChannels.event, listener);
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

export const providerStore: ProviderStoreApi = {
	get: (id: string): Promise<Provider | undefined> => {
		return typedInvokeUnwrap(ProviderStoreChannels.get, id);
	},
	set: (id: string, provider: Provider): Promise<Provider> => {
		return typedInvokeUnwrap(ProviderStoreChannels.set, id, provider);
	},
};

export const agentStore: AgentStoreApi = {
	getProvider: (): Promise<PublicProvider | undefined> => {
		return typedInvokeUnwrap(AgentStoreChannels.getProvider);
	},
	setProvider: (provider: PublicProvider): Promise<boolean> => {
		return typedInvokeUnwrap(AgentStoreChannels.setProvider, provider);
	},
	getModelId: (): Promise<string | undefined> => {
		return typedInvokeUnwrap(AgentStoreChannels.getModelId);
	},
	setModelId: (modelId: string): Promise<boolean> => {
		return typedInvokeUnwrap(AgentStoreChannels.setModelId, modelId);
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
	list: (): Promise<ConnectorRecord> => {
		return typedInvokeUnwrap<ConnectorRecord>(ConnectorsChannels.list);
	},
	get: (id: string): Promise<ConnectorRecord> => {
		return typedInvokeUnwrap<ConnectorRecord>(ConnectorsChannels.get, id);
	},
	upsert: (input: Parameters<ConnectorsApi['upsert']>[0]): Promise<ConnectorRecord> => {
		return typedInvokeUnwrap<ConnectorRecord>(ConnectorsChannels.upsert, input);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('agentStore', agentStore);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('realtimeTranscription', realtimeTranscription);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('providerStore', providerStore);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.agentStore = agentStore;
	// @ts-ignore (define in dts)
	globalThis.win = win;
	// @ts-ignore (define in dts)
	globalThis.agent = agent;
	// @ts-ignore (define in dts)
	globalThis.realtimeTranscription = realtimeTranscription;
	// @ts-ignore (define in dts)
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.providerStore = providerStore;
}
