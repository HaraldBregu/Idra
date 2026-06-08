import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import {
	WindowChannels,
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ConnectorsChannels,
	ProviderChannels,
	RealtimeTranscriptionChannels,
	CronChannels,
	HeartbeatChannels,
	SkillsChannels,
	StoreChannels,
} from '../shared/ipc-channels';
import type {
	AppApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
	HeartbeatApi,
	RealtimeTranscriptionApi,
	SpeechToTextApi,
	SkillsApi,
	StoreApi,
	WindowApi,
} from './types';
import type { ProviderInput, PublicProvider } from '../shared/providers';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/cron';
import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatSetModelRequest,
	HeartbeatSetProviderRequest,
	HeartbeatSetReasoningEffortRequest,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../shared/heartbeat';
import type {
	AssistantSettings,
	AgentRoutingSettings,
	CronSettings,
	ImageCreatorSettings,
	SpeechToTextSettings,
	TextToSoundSettings,
	TextToSpeechSettings,
	TextToVideoSettings,
	TaskSettings,
} from '../shared/store';
import type {
	AgentResponseEvent,
	Model,
	ModelSelection,
	AgentSendRuntimeOptions,
} from '../shared/agents/service';
import { isModelReasoningEffort } from '../shared/agents/service';
import type {
	Channel,
	ChannelStatusEvent,
	ChannelType,
	TelegramChannelProperties,
} from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type { ConnectorRecord } from '../shared/connectors';
import {
	isRealtimeTranscriptionAudioChunk,
	isRealtimeTranscriptionSessionId,
	normalizeRealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';
import {
	isSpeechToTextAudioChunk,
	isSpeechToTextSessionId,
	normalizeSpeechToTextDictationStartRequest,
	normalizeSpeechToTextTranscribeRequest,
} from '../shared/speech-to-text';

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
	options?: AgentSendRuntimeOptions
): AgentSendRuntimeOptions | undefined {
	if (!options) return undefined;
	const normalized: AgentSendRuntimeOptions = {
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
	options?: AgentSendRuntimeOptions
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
	maximize: (): void => {
		typedSend(WindowChannels.maximize);
	},
	close: (): void => {
		typedSend(WindowChannels.close);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	isMaximized: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isMaximized);
	},
	isFullScreen: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isFullScreen);
	},
	onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.maximizeChange, callback);
	},
	onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.fullScreenChange, callback);
	},
} satisfies WindowApi;

export const agent: AgentApi = {
	send_v2: (
		message: string,
		options?: AgentSendRuntimeOptions
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
		return typedInvokeUnwrap(StoreChannels.setProviderApiKey, providerId, apikey);
	},
	isProviderApiKeySaved: (providerId: string): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.isProviderApiKeySaved, providerId);
	},
	getProviders: (): Promise<PublicProvider[]> => {
		return typedInvokeUnwrap(StoreChannels.getProviders);
	},
	addProvider: (input: ProviderInput): Promise<PublicProvider> => {
		return typedInvokeUnwrap(StoreChannels.addProvider, input);
	},
	getModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getModels, provider);
	},
	getAgentService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechTranscriberService);
	},
	getSpeechToTextModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getSpeechToTextModels, provider);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechTranscriberService, provider, model);
	},
	getTextToSpeechService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSpeechService);
	},
	getTextToSpeechModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getTextToSpeechModels, provider);
	},
	saveTextToSpeechService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSpeechService, provider, model);
	},
	getImageCreatorService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getImageCreatorService);
	},
	getImageCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getImageCreatorModels, provider);
	},
	saveImageCreatorService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveImageCreatorService, provider, model);
	},
	getTextToVideoService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToVideoService);
	},
	getTextToVideoModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getTextToVideoModels, provider);
	},
	saveTextToVideoService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToVideoService, provider, model);
	},
	getTextToSoundService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSoundService);
	},
	getTextToSoundModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getTextToSoundModels, provider);
	},
	saveTextToSoundService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSoundService, provider, model);
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

export const speechToText: SpeechToTextApi = {
	transcribe: (request) => {
		return typedInvokeUnwrap(
			SpeechToTextChannels.transcribe,
			normalizeSpeechToTextTranscribeRequest(request)
		);
	},
	startDictation: (request) => {
		return typedInvokeUnwrap(
			SpeechToTextChannels.startDictation,
			normalizeSpeechToTextDictationStartRequest(request)
		);
	},
	appendAudio: (sessionId: string, audio: string): void => {
		if (!isSpeechToTextSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text session id.');
		}
		if (!isSpeechToTextAudioChunk(audio)) {
			throw new Error('Invalid speech-to-text audio chunk.');
		}
		typedSend(SpeechToTextChannels.appendAudio, sessionId, audio);
	},
	finishDictation: (sessionId: string): Promise<void> => {
		if (!isSpeechToTextSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text session id.');
		}
		return typedInvokeUnwrap(SpeechToTextChannels.finishDictation, sessionId);
	},
	cancelDictation: (sessionId: string): Promise<void> => {
		if (!isSpeechToTextSessionId(sessionId)) {
			throw new Error('Invalid speech-to-text session id.');
		}
		return typedInvokeUnwrap(SpeechToTextChannels.cancelDictation, sessionId);
	},
	onEvent: (callback): (() => void) => {
		return typedOn(SpeechToTextChannels.event, callback);
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
	last: (): Promise<HeartbeatEventPayload | null> => {
		return typedInvokeUnwrap(HeartbeatChannels.last);
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
	setProviderId: (request: HeartbeatSetProviderRequest): Promise<HeartbeatSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.setProviderId, assertHeartbeatObject(request));
	},
	setModelId: (request: HeartbeatSetModelRequest): Promise<HeartbeatSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.setModelId, assertHeartbeatObject(request));
	},
	setReasoningEffort: (
		request: HeartbeatSetReasoningEffortRequest
	): Promise<HeartbeatSettings> => {
		return typedInvokeUnwrap(
			HeartbeatChannels.setReasoningEffort,
			assertHeartbeatObject(request)
		);
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
	load: (name: string) => {
		return typedInvokeUnwrap(SkillsChannels.load, name);
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

export const store: StoreApi = {
	getProviders: (): Promise<PublicProvider[]> => {
		return typedInvokeUnwrap(StoreChannels.getProviders);
	},
	setProviderApiKey: (providerId: string, apiKey: string): Promise<void> => {
		return typedInvokeUnwrap(StoreChannels.setProviderApiKey, providerId, apiKey);
	},
	isProviderApiKeySaved: (providerId: string): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.isProviderApiKeySaved, providerId);
	},
	addProvider: (input: ProviderInput): Promise<PublicProvider> => {
		return typedInvokeUnwrap(StoreChannels.addProvider, input);
	},
	getAssistantSettings: (): Promise<AssistantSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAssistantSettings);
	},
	getSpeechToTextSettings: (): Promise<SpeechToTextSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechToTextSettings);
	},
	getTextToSpeechSettings: (): Promise<TextToSpeechSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSpeechSettings);
	},
	getImageCreatorSettings: (): Promise<ImageCreatorSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getImageCreatorSettings);
	},
	getTextToVideoSettings: (): Promise<TextToVideoSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToVideoSettings);
	},
	getTextToSoundSettings: (): Promise<TextToSoundSettings | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSoundSettings);
	},
	getCronSettings: (): Promise<CronSettings> => {
		return typedInvokeUnwrap(StoreChannels.getCronSettings);
	},
	getTaskSettings: (): Promise<TaskSettings> => {
		return typedInvokeUnwrap(StoreChannels.getTaskSettings);
	},
	getAgentRoutingSettings: (): Promise<AgentRoutingSettings> => {
		return typedInvokeUnwrap(StoreChannels.getAgentRoutingSettings);
	},
	getAgentService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechTranscriberService);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechTranscriberService, provider, model);
	},
	getTextToSpeechService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSpeechService);
	},
	saveTextToSpeechService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSpeechService, provider, model);
	},
	getImageCreatorService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getImageCreatorService);
	},
	saveImageCreatorService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveImageCreatorService, provider, model);
	},
	getTextToVideoService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToVideoService);
	},
	saveTextToVideoService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToVideoService, provider, model);
	},
	getTextToSoundService: (): Promise<ModelSelection | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSoundService);
	},
	saveTextToSoundService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSoundService, provider, model);
	},
};

export const channels: ChannelsApi = {
	listCatalog: (): Promise<ChannelCatalogEntry[]> => {
		return typedInvokeUnwrap(ChannelsChannels.listCatalog);
	},
	getConfig: (): Promise<Channel> => {
		return typedInvokeUnwrap(ChannelsChannels.getConfig);
	},
	getChannelConfig: <TKey extends ChannelType>(type: TKey): Promise<Channel[TKey]> => {
		return typedInvokeUnwrap(ChannelsChannels.getChannelConfig, type) as Promise<Channel[TKey]>;
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
	getTelegramConfig: (): Promise<TelegramChannelProperties> => {
		return typedInvokeUnwrap(ChannelsChannels.getTelegramConfig);
	},
	saveTelegramConfig: (config: TelegramChannelProperties): Promise<TelegramChannelProperties> => {
		return typedInvokeUnwrap(ChannelsChannels.saveTelegramConfig, config);
	},
	getTelegramStatus: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.getTelegramStatus);
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
	save: (input: Parameters<ConnectorsApi['save']>[0]): Promise<ConnectorRecord> => {
		return typedInvokeUnwrap<ConnectorRecord>(ConnectorsChannels.save, input);
	},
	upsert: (input: Parameters<ConnectorsApi['upsert']>[0]): Promise<ConnectorRecord> => {
		return typedInvokeUnwrap<ConnectorRecord>(ConnectorsChannels.upsert, input);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('realtimeTranscription', realtimeTranscription);
		contextBridge.exposeInMainWorld('speechToText', speechToText);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('heartbeat', heartbeat);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('store', store);
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
	globalThis.realtimeTranscription = realtimeTranscription;
	// @ts-ignore (define in dts)
	globalThis.speechToText = speechToText;
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
	globalThis.store = store;
}
