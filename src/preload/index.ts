import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import {
	WindowChannels,
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ConnectorsChannels,
	OperatorChannels,
	ProviderChannels,
	RealtimeTranscriptionChannels,
	SpeechToTextChannels,
	TaskChannels,
	CronChannels,
	HeartbeatChannels,
	MonitorChannels,
	PolicyChannels,
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
	MonitorApi,
	PolicyApi,
	RealtimeTranscriptionApi,
	SpeechToTextApi,
	SkillsApi,
	StoreApi,
	TasksApi,
	WindowApi,
} from './index.d';
import type { PolicyConfig } from '../shared/policy';
import type { ProviderInput, PublicProvider } from '../shared/providers';
import type {
	CronExecutionRecord,
	CronNextRunPreview,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleUpdateRequest,
	CronTask,
	CronTaskData,
	CronTaskView,
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
import type { MonitorEventFilter, MonitorEventRecord, MonitorSnapshot } from '../shared/monitor';
import type {
	Agent,
	ConfiguredModelOperator,
	AgentHistoryMessage,
	AgentResponseEvent,
	Model,
	AgentStartupFileContent,
	AgentStartupFileSummary,
	WorkspaceFileContent,
	WorkspaceFileSummary,
	AgentSendRuntimeOptions,
} from '../shared/agents/service';
import type {
	Channel,
	ChannelStatusEvent,
	ChannelType,
	TelegramChannelProperties,
} from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	OPENAI_CONNECTOR_CATALOG,
	ConnectorConfig,
	ConnectorCallToolOptions,
	ConnectorInput,
	ConnectorOAuthConnectResult,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../shared/connector';
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
	send: (message: string, options?: AgentSendRuntimeOptions): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.send, message, options);
	},
	reset: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.reset);
	},
	cancel: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.cancel);
	},
	getHistory: (): Promise<AgentHistoryMessage[]> => {
		return typedInvokeUnwrap(AgentChannels.getHistory);
	},
	openHistoryFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.openHistoryFolder);
	},
	listStartupFiles: (): Promise<AgentStartupFileSummary[]> => {
		return typedInvokeUnwrap(AgentChannels.listStartupFiles);
	},
	readStartupFile: (name: string): Promise<AgentStartupFileContent> => {
		return typedInvokeUnwrap(AgentChannels.readStartupFile, name);
	},
	writeStartupFile: (name: string, content: string): Promise<AgentStartupFileContent> => {
		return typedInvokeUnwrap(AgentChannels.writeStartupFile, name, content);
	},
	listWorkspaceFiles: (): Promise<WorkspaceFileSummary[]> => {
		return typedInvokeUnwrap(AgentChannels.listWorkspaceFiles);
	},
	readWorkspaceFile: (name: string): Promise<WorkspaceFileContent> => {
		return typedInvokeUnwrap(AgentChannels.readWorkspaceFile, name);
	},
	writeWorkspaceFile: (name: string, content: string): Promise<WorkspaceFileContent> => {
		return typedInvokeUnwrap(AgentChannels.writeWorkspaceFile, name, content);
	},
	onResponse: (callback: (event: AgentResponseEvent) => void): (() => void) => {
		return typedOn(AgentChannels.response, callback);
	},
} satisfies AgentApi;

export const app: AppApi = {
	openAppDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openAppDataFolder);
	},
	openUserDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openUserDataFolder);
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
	getKeepAwakeEnabled: (): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.getKeepAwakeEnabled);
	},
	setKeepAwakeEnabled: (enabled: boolean): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.setKeepAwakeEnabled, enabled);
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
	getAssistantOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAssistantOperator);
	},
	saveAssistantOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAssistantOperator, provider, model);
	},
	getSpeechToTextOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechToTextOperator);
	},
	getSpeechToTextModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getSpeechToTextModels, provider);
	},
	saveSpeechToTextOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechToTextOperator, provider, model);
	},
	getTextToSpeechOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSpeechOperator);
	},
	getTextToSpeechModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToSpeechModels, provider);
	},
	saveTextToSpeechOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSpeechOperator, provider, model);
	},
	getImageCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getImageCreatorOperator);
	},
	getImageCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getImageCreatorModels, provider);
	},
	saveImageCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveImageCreatorOperator, provider, model);
	},
	getTextToVideoOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToVideoOperator);
	},
	getTextToVideoModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToVideoModels, provider);
	},
	saveTextToVideoOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToVideoOperator, provider, model);
	},
	getMusicCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getMusicCreatorOperator);
	},
	getMusicCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getMusicCreatorModels, provider);
	},
	saveMusicCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveMusicCreatorOperator, provider, model);
	},
	getAgentService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechTranscriberService);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechTranscriberService, provider, model);
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
	list: (): Promise<CronTaskView[]> => {
		return typedInvokeUnwrap(CronChannels.list);
	},
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	): Promise<CronTask<TData>> => {
		return typedInvokeUnwrap(CronChannels.add, expression, data, options) as Promise<
			CronTask<TData>
		>;
	},
	remove: (id: string): Promise<void> => {
		return typedInvokeUnwrap(CronChannels.remove, id);
	},
	createSchedule: (request: CronScheduleCreateRequest): Promise<CronSchedule> => {
		return typedInvokeUnwrap(CronChannels.createSchedule, request);
	},
	updateSchedule: (scheduleId: string, patch: CronScheduleUpdateRequest): Promise<CronSchedule> => {
		return typedInvokeUnwrap(CronChannels.updateSchedule, scheduleId, patch);
	},
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
	getScheduleEvents: (scheduleId: string): Promise<CronScheduleEvent[]> => {
		return typedInvokeUnwrap(CronChannels.getScheduleEvents, scheduleId);
	},
	getScheduleExecutions: (scheduleId: string): Promise<CronExecutionRecord[]> => {
		return typedInvokeUnwrap(CronChannels.getScheduleExecutions, scheduleId);
	},
	getNextRuns: (scheduleId: string, count: number): Promise<CronNextRunPreview> => {
		return typedInvokeUnwrap(CronChannels.getNextRuns, scheduleId, count);
	},
	runNow: (scheduleId: string): Promise<CronScheduledTask> => {
		return typedInvokeUnwrap(CronChannels.runNow, scheduleId);
	},
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void): (() => void) => {
		return typedOn(CronChannels.event, listener);
	},
	subscribeToSchedule: (
		scheduleId: string,
		listener: (event: CronScheduleEvent) => void
	): (() => void) => {
		return typedOn(CronChannels.event, (event) => {
			if (event.scheduleId === scheduleId) listener(event);
		});
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

export const tasks: TasksApi = {
	start: (request) => {
		return typedInvokeUnwrap(TaskChannels.start, request);
	},
	list: () => {
		return typedInvokeUnwrap(TaskChannels.list);
	},
	get: (id: string) => {
		return typedInvokeUnwrap(TaskChannels.get, id);
	},
	cancel: (id: string) => {
		return typedInvokeUnwrap(TaskChannels.cancel, id);
	},
	onEvent: (callback) => {
		return typedOn(TaskChannels.event, callback);
	},
};

export const monitor: MonitorApi = {
	snapshot: (filter?: MonitorEventFilter): Promise<MonitorSnapshot> => {
		return typedInvokeUnwrap(MonitorChannels.snapshot, filter);
	},
	list: (filter?: MonitorEventFilter): Promise<MonitorEventRecord[]> => {
		return typedInvokeUnwrap(MonitorChannels.list, filter);
	},
	get: (id: string): Promise<MonitorEventRecord | undefined> => {
		return typedInvokeUnwrap(MonitorChannels.get, id);
	},
	onEvent: (callback: (record: MonitorEventRecord) => void): (() => void) => {
		return typedOn(MonitorChannels.event, callback);
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
	getKeepAwakeEnabled: (): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.getKeepAwakeEnabled);
	},
	setKeepAwakeEnabled: (enabled: boolean): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.setKeepAwakeEnabled, enabled);
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
	getConnectorSettings: (): Promise<ConnectorConfig[]> => {
		return typedInvokeUnwrap(StoreChannels.getConnectorSettings);
	},
	getAssistantOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAssistantOperator);
	},
	saveAssistantOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAssistantOperator, provider, model);
	},
	getSpeechToTextOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechToTextOperator);
	},
	saveSpeechToTextOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechToTextOperator, provider, model);
	},
	getTextToSpeechOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToSpeechOperator);
	},
	saveTextToSpeechOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToSpeechOperator, provider, model);
	},
	getImageCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getImageCreatorOperator);
	},
	saveImageCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveImageCreatorOperator, provider, model);
	},
	getTextToVideoOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getTextToVideoOperator);
	},
	saveTextToVideoOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveTextToVideoOperator, provider, model);
	},
	getMusicCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getMusicCreatorOperator);
	},
	saveMusicCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveMusicCreatorOperator, provider, model);
	},
	getAgentService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(StoreChannels.getSpeechTranscriberService);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(StoreChannels.saveSpeechTranscriberService, provider, model);
	},
};

export const policy: PolicyApi = {
	get: (): Promise<PolicyConfig> => {
		return typedInvokeUnwrap(PolicyChannels.get);
	},
	set: (config: PolicyConfig): Promise<PolicyConfig> => {
		return typedInvokeUnwrap(PolicyChannels.set, config);
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
	catalog: (): Promise<typeof OPENAI_CONNECTOR_CATALOG> => {
		return typedInvokeUnwrap(ConnectorsChannels.catalog);
	},
	list: (): Promise<ConnectorView[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.list);
	},
	get: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.get, id);
	},
	add: (input: ConnectorInput): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.add, input);
	},
	update: (id: string, input: ConnectorUpdateInput): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.update, id, input);
	},
	remove: (id: string): Promise<void> => {
		return typedInvokeUnwrap(ConnectorsChannels.remove, id);
	},
	enable: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.enable, id);
	},
	disable: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.disable, id);
	},
	test: (id: string): Promise<ConnectorTestResult> => {
		return typedInvokeUnwrap(ConnectorsChannels.test, id);
	},
	reconnect: (id: string): Promise<ConnectorTestResult> => {
		return typedInvokeUnwrap(ConnectorsChannels.reconnect, id);
	},
	refreshTools: (id: string): Promise<ConnectorTool[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.refreshTools, id);
	},
	listTools: (id: string): Promise<ConnectorTool[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.listTools, id);
	},
	callTool: (
		id: string,
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	): Promise<unknown> => {
		return typedInvokeUnwrap(ConnectorsChannels.callTool, id, name, args, options);
	},
	connectOAuth: (id: string): Promise<ConnectorOAuthConnectResult> => {
		return typedInvokeUnwrap(ConnectorsChannels.connectOAuth, id);
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
		contextBridge.exposeInMainWorld('tasks', tasks);
		contextBridge.exposeInMainWorld('monitor', monitor);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('policy', policy);
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
	globalThis.tasks = tasks;
	// @ts-ignore (define in dts)
	globalThis.monitor = monitor;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.policy = policy;
	// @ts-ignore (define in dts)
	globalThis.store = store;
}
