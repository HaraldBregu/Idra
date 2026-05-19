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
	send: (message: string) => Promise<string>;
	reset: () => Promise<void>;
	cancel: () => Promise<void>;
	getHistory: () => Promise<AgentHistoryMessage[]>;
	resolveApproval: (id: string, decision: ApprovalDecision | boolean) => Promise<boolean>;
	resolveInput: (id: string, answer: string) => Promise<boolean>;
	getPending: () => Promise<AgentPendingState>;
	listWorkspaceFiles: () => Promise<WorkspaceFileSummary[]>;
	readWorkspaceFile: (name: string) => Promise<WorkspaceFileContent>;
	writeWorkspaceFile: (name: string, content: string) => Promise<WorkspaceFileContent>;
	onResponse: (callback: (event: AgentResponseEvent) => void) => () => void;
	onPending: (callback: (event: AgentPendingEventPayload) => void) => () => void;
}

export interface CronApi {
	list: () => Promise<CronTaskView[]>;
	listJobs: (include?: 'enabled' | 'disabled' | 'all') => Promise<FridayCronJob[]>;
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	) => Promise<CronTask<TData>>;
	remove: (id: string) => Promise<void>;
	removeJob: (id: string) => Promise<void>;
	createSchedule: (request: CronScheduleCreateRequest) => Promise<CronSchedule>;
	updateSchedule: (
		scheduleId: string,
		patch: CronScheduleUpdateRequest
	) => Promise<CronSchedule>;
	pauseSchedule: (scheduleId: string) => Promise<void>;
	resumeSchedule: (scheduleId: string) => Promise<void>;
	deleteSchedule: (scheduleId: string) => Promise<void>;
	listSchedules: (filter?: CronScheduleFilter) => Promise<CronSchedule[]>;
	getSchedule: (scheduleId: string) => Promise<CronSchedule>;
	getScheduleEvents: (scheduleId: string) => Promise<CronScheduleEvent[]>;
	getScheduleExecutions: (scheduleId: string) => Promise<CronExecutionRecord[]>;
	getNextRuns: (scheduleId: string, count: number) => Promise<CronNextRunPreview>;
	runNow: (scheduleId: string) => Promise<CronScheduledTask>;
	action: (request: FridayCronToolRequest) => Promise<FridayCronToolResponse>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
	subscribeToSchedule: (
		scheduleId: string,
		listener: (event: CronScheduleEvent) => void
	) => () => void;
}

export interface HeartbeatApi {
	status: () => Promise<HeartbeatStatus>;
	last: () => Promise<HeartbeatEventPayload | null>;
	setEnabled: (request: HeartbeatSetEnabledRequest) => Promise<HeartbeatStatus>;
	getTiming: () => Promise<HeartbeatTimingSettings>;
	updateTiming: (request: HeartbeatTimingSettings) => Promise<HeartbeatTimingSettings>;
	systemEvent: (
		request: HeartbeatSystemEventRequest
	) => Promise<HeartbeatSystemEventResult>;
	request: (request: HeartbeatWakeRequest) => Promise<void>;
	onEvent: (callback: (event: HeartbeatEventPayload) => void) => () => void;
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
	saveTelegramConfig: (
		config: TelegramChannelProperties
	) => Promise<TelegramChannelProperties>;
	getTelegramStatus: () => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

export interface ConnectorsApi {
	catalog: () => Promise<typeof OPENAI_CONNECTOR_CATALOG>;
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
		args: unknown,
		options?: ConnectorCallToolOptions
	) => Promise<unknown>;
	connectOAuth: (id: string) => Promise<ConnectorOAuthConnectResult>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillInfo | undefined>;
	delete: (id: string) => Promise<void>;
	getRoot: () => Promise<string>;
}

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
	AgentHistoryMessage,
	ApprovalDecision,
	AgentPendingEventPayload,
	AgentPendingState,
	AgentResponseEvent,
	Model,
	WorkspaceFileContent,
	WorkspaceFileSummary,
} from '../shared/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channel-catalog';
import type { AppInfo } from '../shared/apps';
import type { SkillInfo } from '../shared/skills';
import type { ThemeMode } from '../shared/theme';
import type { MicrophonePermissionSettings } from '../shared/app-permissions';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../shared/realtime-transcription';
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
} from '../shared/connectors';

export interface AppApi {
	setTheme: (theme: ThemeMode) => void;
	onThemeChange: (callback: (theme: ThemeMode) => void) => () => void;
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
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAgentService: () => Promise<Agent | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<Agent | undefined>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	listApps: () => Promise<AppInfo[]>;
	openAppFolder: (id: string) => Promise<void>;
	deleteApp: (id: string) => Promise<void>;
	getAppsRoot: () => Promise<string>;
}

export interface RealtimeTranscriptionApi {
	start: (request?: RealtimeTranscriptionStartRequest) => Promise<RealtimeTranscriptionSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finish: (sessionId: string) => Promise<void>;
	cancel: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: RealtimeTranscriptionEvent) => void) => () => void;
}

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		agent: AgentApi;
		realtimeTranscription: RealtimeTranscriptionApi;
		cron: CronApi;
		heartbeat: HeartbeatApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
	}
}
