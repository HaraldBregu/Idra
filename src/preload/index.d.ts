export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	popupMenu: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AgentApi {
	send: (message: string, options?: AgentSendRuntimeOptions) => Promise<string>;
	reset: () => Promise<void>;
	cancel: () => Promise<void>;
	getHistory: () => Promise<AgentHistoryMessage[]>;
	openHistoryFolder: () => Promise<void>;
	listStartupFiles: () => Promise<AgentStartupFileSummary[]>;
	readStartupFile: (name: string) => Promise<AgentStartupFileContent>;
	writeStartupFile: (name: string, content: string) => Promise<AgentStartupFileContent>;
	/** @deprecated Use listStartupFiles. */
	listWorkspaceFiles: () => Promise<WorkspaceFileSummary[]>;
	/** @deprecated Use readStartupFile. */
	readWorkspaceFile: (name: string) => Promise<WorkspaceFileContent>;
	/** @deprecated Use writeStartupFile. */
	writeWorkspaceFile: (name: string, content: string) => Promise<WorkspaceFileContent>;
	onResponse: (callback: (event: AgentResponseEvent) => void) => () => void;
}

export interface CronApi {
	list: () => Promise<CronTaskView[]>;
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	) => Promise<CronTask<TData>>;
	remove: (id: string) => Promise<void>;
	createSchedule: (request: CronScheduleCreateRequest) => Promise<CronSchedule>;
	updateSchedule: (scheduleId: string, patch: CronScheduleUpdateRequest) => Promise<CronSchedule>;
	pauseSchedule: (scheduleId: string) => Promise<void>;
	resumeSchedule: (scheduleId: string) => Promise<void>;
	deleteSchedule: (scheduleId: string) => Promise<void>;
	listSchedules: (filter?: CronScheduleFilter) => Promise<CronSchedule[]>;
	getSchedule: (scheduleId: string) => Promise<CronSchedule>;
	getScheduleEvents: (scheduleId: string) => Promise<CronScheduleEvent[]>;
	getScheduleExecutions: (scheduleId: string) => Promise<CronExecutionRecord[]>;
	getNextRuns: (scheduleId: string, count: number) => Promise<CronNextRunPreview>;
	runNow: (scheduleId: string) => Promise<CronScheduledTask>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
	subscribeToSchedule: (
		scheduleId: string,
		listener: (event: CronScheduleEvent) => void
	) => () => void;
}

export interface HeartbeatApi {
	status: () => Promise<HeartbeatStatus>;
	last: () => Promise<HeartbeatEventPayload | null>;
	settings: () => Promise<HeartbeatSettings>;
	saveSettings: (request: HeartbeatSettingsUpdate) => Promise<HeartbeatSettings>;
	setEnabled: (request: HeartbeatSetEnabledRequest) => Promise<HeartbeatStatus>;
	getTiming: () => Promise<HeartbeatTimingSettings>;
	updateTiming: (request: HeartbeatTimingSettings) => Promise<HeartbeatTimingSettings>;
	setProviderId: (request: HeartbeatSetProviderRequest) => Promise<HeartbeatSettings>;
	setModelId: (request: HeartbeatSetModelRequest) => Promise<HeartbeatSettings>;
	setReasoningEffort: (
		request: HeartbeatSetReasoningEffortRequest
	) => Promise<HeartbeatSettings>;
	systemEvent: (request: HeartbeatSystemEventRequest) => Promise<HeartbeatSystemEventResult>;
	request: (request: HeartbeatWakeRequest) => Promise<void>;
	onEvent: (callback: (event: HeartbeatEventPayload) => void) => () => void;
}

export interface TasksApi {
	start: <TInput = unknown>(request: TaskRunRequest<TInput>) => Promise<TaskRecord>;
	list: () => Promise<TaskRecord[]>;
	get: (id: string) => Promise<TaskRecord | undefined>;
	cancel: (id: string) => Promise<TaskRecord>;
	onEvent: (callback: (event: TaskEvent) => void) => () => void;
}

export interface MonitorApi {
	snapshot: (filter?: MonitorEventFilter) => Promise<MonitorSnapshot>;
	list: (filter?: MonitorEventFilter) => Promise<MonitorEventRecord[]>;
	get: (id: string) => Promise<MonitorEventRecord | undefined>;
	onEvent: (callback: (record: MonitorEventRecord) => void) => () => void;
}

export interface ChannelsApi {
	listCatalog: () => Promise<ChannelCatalogEntry[]>;
	getConfig: () => Promise<Channel>;
	getChannelConfig: <TKey extends ChannelType>(type: TKey) => Promise<Channel[TKey]>;
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	) => Promise<Channel[TKey]>;
	getStatus: (type?: ChannelType) => Promise<ChannelStatusEvent | undefined>;
	getTelegramConfig: () => Promise<TelegramChannelProperties>;
	saveTelegramConfig: (config: TelegramChannelProperties) => Promise<TelegramChannelProperties>;
	getTelegramStatus: () => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

export interface ConnectorsApi {
	catalog: () => Promise<ConnectorCatalogEntry[]>;
	list: () => Promise<ConnectorView[]>;
	get: (id: string) => Promise<ConnectorConfig>;
	add: (input: ConnectorInput) => Promise<ConnectorConfig>;
	update: (id: string, input: ConnectorUpdateInput) => Promise<ConnectorConfig>;
	remove: (id: string) => Promise<void>;
	enable: (id: string) => Promise<ConnectorConfig>;
	disable: (id: string) => Promise<ConnectorConfig>;
	test: (id: string) => Promise<ConnectorTestResult>;
	reconnect: (id: string) => Promise<ConnectorTestResult>;
	refreshTools: (id: string) => Promise<ConnectorTool[]>;
	listTools: (id: string) => Promise<ConnectorTool[]>;
	callTool: (
		id: string,
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	) => Promise<unknown>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	load: (name: string) => Promise<SkillDetails>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	getRoot: () => Promise<string>;
}

export interface PolicyApi {
	get: () => Promise<PolicyConfig>;
	set: (policy: PolicyConfig) => Promise<PolicyConfig>;
}

export interface StoreApi {
	getProviders: () => Promise<PublicProvider[]>;
	setProviderApiKey: (providerId: string, apiKey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getKeepAwakeEnabled: () => Promise<boolean>;
	setKeepAwakeEnabled: (enabled: boolean) => Promise<boolean>;
	getAssistantSettings: () => Promise<AssistantSettings | undefined>;
	getSpeechToTextSettings: () => Promise<SpeechToTextSettings | undefined>;
	getTextToSpeechSettings: () => Promise<TextToSpeechSettings | undefined>;
	getImageCreatorSettings: () => Promise<ImageCreatorSettings | undefined>;
	getTextToVideoSettings: () => Promise<TextToVideoSettings | undefined>;
	getTextToSoundSettings: () => Promise<TextToSoundSettings | undefined>;
	getCronSettings: () => Promise<CronSettings>;
	getTaskSettings: () => Promise<TaskSettings>;
	getAgentRoutingSettings: () => Promise<AgentRoutingSettings>;
	getConnectorSettings: () => Promise<ConnectorConfig[]>;
	getAssistantOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveAssistantOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechToTextOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveSpeechToTextOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSpeechOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveTextToSpeechOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageCreatorOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveImageCreatorOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToVideoOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveTextToVideoOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getMusicCreatorOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveMusicCreatorOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getAgentService: () => Promise<Agent | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<Agent | undefined>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

import type { ProviderInput, PublicProvider } from '../shared/providers';
import type { PolicyConfig } from '../shared/policy';
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
import type { MonitorEventFilter, MonitorEventRecord, MonitorSnapshot } from '../shared/monitor';
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
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	SkillDeleteResult,
	SkillDetails,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
} from '../shared/skills';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app-permissions';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';
import type {
	SpeechToTextDictationSession,
	SpeechToTextDictationStartRequest,
	SpeechToTextEvent,
	SpeechToTextTranscribeRequest,
	SpeechToTextTranscription,
} from '../shared/speech-to-text';
import type { TaskEvent, TaskRecord, TaskRunRequest } from '../shared/tasks';
import type {
	ConnectorCatalogEntry,
	ConnectorConfig,
	ConnectorCallToolOptions,
	ConnectorInput,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../shared/connector';

export interface AppApi {
	openAppDataFolder: () => Promise<void>;
	openUserDataFolder: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	getTrayEnabled: () => Promise<boolean>;
	getKeepAwakeEnabled: () => Promise<boolean>;
	setKeepAwakeEnabled: (enabled: boolean) => Promise<boolean>;
	getMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	setMicrophoneEnabled: (enabled: boolean) => Promise<MicrophonePermissionSettings>;
	requestMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	openSystemPreference: (pane: SystemPreferencePaneId) => Promise<void>;
	getCameraPermission: () => Promise<CameraPermissionSettings>;
	setCameraEnabled: (enabled: boolean) => Promise<CameraPermissionSettings>;
	requestCameraPermission: () => Promise<CameraPermissionSettings>;
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAssistantOperator: () => Promise<ConfiguredModelOperator | undefined>;
	saveAssistantOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechToTextOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getSpeechToTextModels: (provider: PublicProvider) => Promise<Model[]>;
	saveSpeechToTextOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSpeechOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getTextToSpeechModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToSpeechOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageCreatorOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getImageCreatorModels: (provider: PublicProvider) => Promise<Model[]>;
	saveImageCreatorOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToVideoOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getTextToVideoModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToVideoOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getMusicCreatorOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getMusicCreatorModels: (provider: PublicProvider) => Promise<Model[]>;
	saveMusicCreatorOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getAgentService: () => Promise<Agent | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<Agent | undefined>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

export interface RealtimeTranscriptionApi {
	start: (request?: RealtimeTranscriptionStartRequest) => Promise<RealtimeTranscriptionSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finish: (sessionId: string) => Promise<void>;
	cancel: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: RealtimeTranscriptionEvent) => void) => () => void;
}

export interface SpeechToTextApi {
	transcribe: (request: SpeechToTextTranscribeRequest) => Promise<SpeechToTextTranscription>;
	startDictation: (
		request?: SpeechToTextDictationStartRequest
	) => Promise<SpeechToTextDictationSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finishDictation: (sessionId: string) => Promise<void>;
	cancelDictation: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: SpeechToTextEvent) => void) => () => void;
}

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		agent: AgentApi;
		realtimeTranscription: RealtimeTranscriptionApi;
		speechToText: SpeechToTextApi;
		cron: CronApi;
		heartbeat: HeartbeatApi;
		tasks: TasksApi;
		monitor: MonitorApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		policy: PolicyApi;
		store: StoreApi;
	}
}
