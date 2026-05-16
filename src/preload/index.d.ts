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
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	) => Promise<CronTask<TData>>;
	remove: (id: string) => Promise<void>;
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
	runNow: (scheduleId: string) => Promise<Task>;
	action: (request: OpenClawCronToolRequest) => Promise<OpenClawCronToolResponse>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
	subscribeToSchedule: (
		scheduleId: string,
		listener: (event: CronScheduleEvent) => void
	) => () => void;
}

export interface ChannelsApi {
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
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillInfo | undefined>;
	delete: (id: string) => Promise<void>;
	getRoot: () => Promise<string>;
}

export interface TasksApi {
	createTask: (request: TaskCreateRequest) => Promise<Task>;
	getTask: (taskId: TaskId) => Promise<Task>;
	listTasks: (filter?: TaskListFilter) => Promise<Task[]>;
	cancelTask: (taskId: TaskId, reason?: string) => Promise<void>;
	retryTask: (taskId: TaskId) => Promise<void>;
	subscribeToTask: (taskId: TaskId, callback: (event: TaskEvent) => void) => () => void;
	subscribeToTaskList: (filter: TaskListFilter | undefined, callback: (event: TaskEvent) => void) => () => void;
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
	OpenClawCronToolRequest,
	OpenClawCronToolResponse,
} from '../shared/cron';
import type { Task } from '../shared/task';
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
import type { AppInfo } from '../shared/apps';
import type { SkillInfo } from '../shared/skills';
import type { Task, TaskCreateRequest, TaskEvent, TaskId, TaskListFilter } from '../shared/task';
import type {
	OPENAI_CONNECTOR_CATALOG,
	ConnectorConfig,
	ConnectorCallToolOptions,
	ConnectorInput,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../shared/connectors';

export interface AppApi {
	openAppDataFolder: () => Promise<void>;
	openUserDataFolder: () => Promise<void>;
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	getTrayEnabled: () => Promise<boolean>;
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAgentService: () => Promise<Agent | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageGenerationModels: (provider: PublicProvider) => Promise<Model[]>;
	getImageGenerationService: () => Promise<Agent | undefined>;
	saveImageGenerationService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	listApps: () => Promise<AppInfo[]>;
	openAppFolder: (id: string) => Promise<void>;
	deleteApp: (id: string) => Promise<void>;
	getAppsRoot: () => Promise<string>;
}

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		agent: AgentApi;
		cron: CronApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		tasks: TasksApi;
	}
}
