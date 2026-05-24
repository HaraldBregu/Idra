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
	TaskChannels,
	CronChannels,
	HeartbeatChannels,
	SkillsChannels,
} from '../shared/ipc-channels';
import type {
	AppApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
	HeartbeatApi,
	RealtimeTranscriptionApi,
	SkillsApi,
	TasksApi,
	WindowApi,
} from './index.d';
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
	FridayCronJob,
	FridayCronToolRequest,
	FridayCronToolResponse,
} from '../shared/cron';
import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../shared/heartbeat';
import type {
	Agent,
	ConfiguredModelOperator,
	AgentHistoryMessage,
	AgentResponseEvent,
	Model,
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

function isFridayCronJob(value: unknown): value is FridayCronJob {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { id?: unknown }).id === 'string' &&
		typeof (value as { name?: unknown }).name === 'string' &&
		typeof (value as { enabled?: unknown }).enabled === 'boolean' &&
		typeof (value as { state?: unknown }).state === 'object' &&
		(value as { state?: unknown }).state !== null
	);
}

async function cronAction(request: FridayCronToolRequest): Promise<FridayCronToolResponse> {
	const response = await typedInvokeUnwrap(CronChannels.action, request);
	if (response.status === 'error') {
		throw new Error(response.error ?? 'Cron action failed.');
	}
	return response;
}

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
		return typedInvokeUnwrap(AppChannels.getKeepAwakeEnabled);
	},
	setKeepAwakeEnabled: (enabled: boolean): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.setKeepAwakeEnabled, enabled);
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
		return typedInvokeUnwrap(ProviderChannels.setApiKey, providerId, apikey);
	},
	isProviderApiKeySaved: (providerId: string): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.isApiKeySaved, providerId);
	},
	getProviders: (): Promise<PublicProvider[]> => {
		return typedInvokeUnwrap(ProviderChannels.getAll);
	},
	addProvider: (input: ProviderInput): Promise<PublicProvider> => {
		return typedInvokeUnwrap(ProviderChannels.add, input);
	},
	getModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getModels, provider);
	},
	getAssistantOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getAssistant);
	},
	saveAssistantOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveAssistant, provider, model);
	},
	getSpeechToTextOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getSpeechToText);
	},
	getSpeechToTextModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getSpeechToTextModels, provider);
	},
	saveSpeechToTextOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveSpeechToText, provider, model);
	},
	getTextToSpeechOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToSpeech);
	},
	getTextToSpeechModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToSpeechModels, provider);
	},
	saveTextToSpeechOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveTextToSpeech, provider, model);
	},
	getImageCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getImageCreator);
	},
	getImageCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getImageCreatorModels, provider);
	},
	saveImageCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveImageCreator, provider, model);
	},
	getTextToVideoOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToVideo);
	},
	getTextToVideoModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getTextToVideoModels, provider);
	},
	saveTextToVideoOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveTextToVideo, provider, model);
	},
	getMusicCreatorOperator: (): Promise<ConfiguredModelOperator | undefined> => {
		return typedInvokeUnwrap(OperatorChannels.getMusicCreator);
	},
	getMusicCreatorModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(OperatorChannels.getMusicCreatorModels, provider);
	},
	saveMusicCreatorOperator: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(OperatorChannels.saveMusicCreator, provider, model);
	},
	getAgentService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(ProviderChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveAgentService, provider, model);
	},
	getSpeechTranscriberService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(ProviderChannels.getSpeechTranscriberService);
	},
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveSpeechTranscriberService, provider, model);
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
	list: (): Promise<CronTaskView[]> => {
		return typedInvokeUnwrap(CronChannels.list);
	},
	listJobs: async (include = 'all'): Promise<FridayCronJob[]> => {
		const response = await cronAction({ action: 'list', include });
		if (!Array.isArray(response.result)) return [];
		return response.result.filter(isFridayCronJob);
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
	removeJob: async (id: string): Promise<void> => {
		await cronAction({ action: 'remove', jobId: id });
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
	action: cronAction,
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
	setEnabled: (request: HeartbeatSetEnabledRequest): Promise<HeartbeatStatus> => {
		return typedInvokeUnwrap(HeartbeatChannels.setEnabled, request);
	},
	getTiming: (): Promise<HeartbeatTimingSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.getTiming);
	},
	updateTiming: (request: HeartbeatTimingSettings): Promise<HeartbeatTimingSettings> => {
		return typedInvokeUnwrap(HeartbeatChannels.updateTiming, request);
	},
	systemEvent: (request: HeartbeatSystemEventRequest): Promise<HeartbeatSystemEventResult> => {
		return typedInvokeUnwrap(HeartbeatChannels.systemEvent, request);
	},
	request: (request: HeartbeatWakeRequest): Promise<void> => {
		return typedInvokeUnwrap(HeartbeatChannels.request, request);
	},
	onEvent: (callback: (event: HeartbeatEventPayload) => void): (() => void) => {
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

export const skills: SkillsApi = {
	list: () => {
		return typedInvokeUnwrap(SkillsChannels.list);
	},
	importSkill: () => {
		return typedInvokeUnwrap(SkillsChannels.import);
	},
	downloadSkill: (id: string) => {
		return typedInvokeUnwrap(SkillsChannels.download, id);
	},
	delete: (id: string): Promise<void> => {
		return typedInvokeUnwrap(SkillsChannels.delete, id);
	},
	getRoot: (): Promise<string> => {
		return typedInvokeUnwrap(SkillsChannels.getRoot);
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
		args: unknown,
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
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('heartbeat', heartbeat);
		contextBridge.exposeInMainWorld('tasks', tasks);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
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
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.heartbeat = heartbeat;
	// @ts-ignore (define in dts)
	globalThis.tasks = tasks;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
}
