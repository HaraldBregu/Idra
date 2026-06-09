import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
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
	HeartbeatChannels,
	SkillsChannels,
} from '../shared/ipc/ipc-channels';
import type {
	AppApi,
	AgentStoreApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
	HeartbeatApi,
	RealtimeTranscriptionApi,
	ProviderStoreApi,
	SkillsApi,
	WindowApi,
} from './types';
import type { PublicProvider } from '../shared/providers';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/app/cron';
import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../shared/heartbeat';
import type {
	AgentResponseEvent,
	Model,
	ModelSelection,
} from '../shared/agents/service';
import { isModelReasoningEffort } from '../shared/agents/service';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type { ConnectorRecord } from '../shared/connectors';
import type { Provider } from '../shared/providers/types';
import {
	isRealtimeTranscriptionAudioChunk,
	isRealtimeTranscriptionSessionId,
	normalizeRealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';

function assertHeartbeatObject<T>(request: T): T {
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid heartbeat request.');
	}
	return request;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const items = value
		.map(optionalTrimmedString)
		.filter((item): item is string => Boolean(item));
	return items.length > 0 ? items : undefined;
}

function normalizeAgentSendRuntimeOptions(
	options?: Record<string, unknown>
): Record<string, unknown> | undefined {
	if (!options) return undefined;
	const normalized: Record<string, unknown> = {
		...(optionalTrimmedString(options.runId) ? { runId: optionalTrimmedString(options.runId) } : {}),
		...(optionalTrimmedString(options.sessionId)
			? { sessionId: optionalTrimmedString(options.sessionId) }
			: {}),
		...(optionalTrimmedString(options.agentRuntime)
			? { agentRuntime: optionalTrimmedString(options.agentRuntime) }
			: {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model) ? { model: optionalTrimmedString(options.model) } : {}),
		...(isModelReasoningEffort(options.effort) ? { effort: options.effort } : {}),
		...(typeof options.lightContext === 'boolean'
			? { lightContext: options.lightContext }
			: {}),
		...(optionalStringList(options.toolsAllow)
			? { toolsAllow: optionalStringList(options.toolsAllow) }
			: {}),
		...(optionalStringList(options.toolsDeny)
			? { toolsDeny: optionalStringList(options.toolsDeny) }
			: {}),
	};
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function isTerminalAgentEvent(event: AgentResponseEvent): boolean {
	return (
		event.type === 'run_finished' ||
		(event.type === 'run_state' &&
			(event.state === 'completed' || event.state === 'cancelled' || event.state === 'error'))
	);
}

function createAgentV2Stream(
	message: string,
	options?: Record<string, unknown>
): AsyncIterable<AgentResponseEvent> {
	const runId = options?.runId?.trim() || crypto.randomUUID();
	const runtimeOptions = normalizeAgentSendRuntimeOptions({ ...options, runId });

	return {
		[Symbol.asyncIterator](): AsyncIterator<AgentResponseEvent> {
			const queue: AgentResponseEvent[] = [];
			let done = false;
			let error: Error | undefined;
			let wake: (() => void) | undefined;
			const notify = (): void => {
				wake?.();
				wake = undefined;
			};

			const offResponse = typedOn(AgentChannels.response, (event: AgentResponseEvent) => {
				if (event.runId !== runId) return;
				queue.push(event);
				if (isTerminalAgentEvent(event)) done = true;
				notify();
			});

			void (runtimeOptions
				? typedInvokeUnwrap(AgentChannels.sendV2, message, runtimeOptions)
				: typedInvokeUnwrap(AgentChannels.sendV2, message)
			)
				.catch((requestError: unknown) => {
					error =
						requestError instanceof Error
							? requestError
							: new Error('Agent v2 request failed.');
				})
				.finally(() => {
					done = true;
					notify();
				});

			return {
				async next(): Promise<IteratorResult<AgentResponseEvent>> {
					while (queue.length === 0 && !done) {
						await new Promise<void>((resolve) => {
							wake = resolve;
						});
					}

					const event = queue.shift();
					if (event) return { done: false, value: event };

					offResponse();
					if (error) throw error;
					return { done: true, value: undefined };
				},
				async return(): Promise<IteratorResult<AgentResponseEvent>> {
					done = true;
					offResponse();
					void typedInvokeUnwrap(AgentChannels.cancel).catch(() => undefined);
					return { done: true, value: undefined };
				},
			};
		},
	};
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
		options?: Record<string, unknown>
	): AsyncIterable<AgentResponseEvent> => {
		return createAgentV2Stream(message, options);
	},
} satisfies AgentApi;

export const app: AppApi = {
	openAppDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openAppDataFolder);
	},
	openExternalUrl: (url: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openExternalUrl, url);
	},
	authorizeOAuth: (input: Parameters<AppApi['authorizeOAuth']>[0]) => {
		return typedInvokeUnwrap(AppChannels.authorizeOAuth, input);
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
	setProviderApiKey: (providerId: string, apikey: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.setProviderApiKey, providerId, apikey);
	},
	isProviderApiKeySaved: (providerId: string): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.isProviderApiKeySaved, providerId);
	},
	getProviders: (): Promise<PublicProvider[]> => {
		return typedInvokeUnwrap(AppChannels.getProviders);
	},
	getModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getModels, provider);
	},
	getAgentService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getSpeechTranscriberService);
	},
	getSpeechToTextModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getSpeechToTextModels, provider);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveSpeechTranscriberService, provider, model);
	},
	getTextToSpeechService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getTextToSpeechService);
	},
	getTextToSpeechModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getTextToSpeechModels, provider);
	},
	saveTextToSpeechService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveTextToSpeechService, provider, model);
	},
	getImageCreatorService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getImageCreatorService);
	},
	getImageCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getImageCreatorModels, provider);
	},
	saveImageCreatorService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveImageCreatorService, provider, model);
	},
	getTextToVideoService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getTextToVideoService);
	},
	getTextToVideoModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getTextToVideoModels, provider);
	},
	saveTextToVideoService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveTextToVideoService, provider, model);
	},
	getTextToSoundService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AppChannels.getTextToSoundService);
	},
	getTextToSoundModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(AppChannels.getTextToSoundModels, provider);
	},
	saveTextToSoundService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.saveTextToSoundService, provider, model);
	},
};

export const realtimeTranscription: RealtimeTranscriptionApi = {
	start: (request) => {
		return typedInvokeUnwrap(
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
		return typedOn(RealtimeTranscriptionChannels.event, callback);
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

export const heartbeat: HeartbeatApi = {
	status: (): Promise<HeartbeatStatus> => {
		return typedInvokeUnwrap(HeartbeatChannels.status);
	},
	settings: (): Promise<HeartbeatSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.settings);
	},
	saveSettings: (request: HeartbeatSettingsUpdate): Promise<HeartbeatSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.saveSettings, assertHeartbeatObject(request));
	},
	setEnabled: (request: HeartbeatSetEnabledRequest): Promise<HeartbeatStatus> => {
		return typedInvokeUnwrap(HeartbeatChannels.setEnabled, assertHeartbeatObject(request));
	},
	getTiming: (): Promise<HeartbeatTimingSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.getTiming);
	},
	updateTiming: (request: HeartbeatTimingSettings): Promise<HeartbeatTimingSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.updateTiming, assertHeartbeatObject(request));
	},
	systemEvent: (request: HeartbeatSystemEventRequest): Promise<HeartbeatSystemEventResult> => {
		return typedInvokeUnwrap(HeartbeatChannels.systemEvent, assertHeartbeatObject(request));
	},
	request: (request: HeartbeatWakeRequest): Promise<void> => {
		return typedInvokeUnwrap(HeartbeatChannels.request, assertHeartbeatObject(request));
	},
	onEvent: (callback: (event: HeartbeatEventPayload) => void): (() => void) => {
		if (typeof callback !== 'function') throw new Error('heartbeat event callback must be a function.');
		return typedOn(HeartbeatChannels.event, callback);
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
	get: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(AgentStoreChannels.get);
	},
	set: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(AgentStoreChannels.set, provider, model);
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
		contextBridge.exposeInMainWorld('heartbeat', heartbeat);
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
	globalThis.heartbeat = heartbeat;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.providerStore = providerStore;
}
