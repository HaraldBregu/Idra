import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import {
	WindowChannels,
	AgentChannels,
	AppChannels,
	ChannelsChannels,
	ConnectorsChannels,
	ProviderChannels,
	CronChannels,
	AppsChannels,
	SkillsChannels,
	TaskChannels,
} from '../shared/ipc-channels';
import type {
	AppApi,
	AgentApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
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
	OpenClawCronToolRequest,
	OpenClawCronToolResponse,
} from '../shared/cron';
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
import type { Channel, ChannelStatusEvent, ChannelType, TelegramChannelProperties } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channel-catalog';
import type { AppInfo } from '../shared/apps';
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
import type { Task, TaskCreateRequest, TaskEvent, TaskId, TaskListFilter } from '../shared/task';

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
	send: (message: string): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.send, message);
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
	resolveApproval: (id: string, decision: ApprovalDecision | boolean): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.resolveApproval, id, decision);
	},
	resolveInput: (id: string, answer: string): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.resolveInput, id, answer);
	},
	getPending: (): Promise<AgentPendingState> => {
		return typedInvokeUnwrap(AgentChannels.getPending);
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
	onPending: (callback: (event: AgentPendingEventPayload) => void): (() => void) => {
		return typedOn(AgentChannels.pending, callback);
	},
} satisfies AgentApi;

export const app: AppApi = {
	openAppDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openAppDataFolder);
	},
	openUserDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openUserDataFolder);
	},
	setTrayEnabled: (enabled: boolean): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled);
	},
	getTrayEnabled: (): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.getTrayEnabled);
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
	getAgentService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(ProviderChannels.getAgentService);
	},
	saveAgentService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveAgentService, provider, model);
	},
	getImageGenerationModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getImageGenerationModels, provider);
	},
	getImageGenerationService: (): Promise<Agent | undefined> => {
		return typedInvokeUnwrap(ProviderChannels.getImageGenerationService);
	},
	saveImageGenerationService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveImageGenerationService, provider, model);
	},
	listApps: (): Promise<AppInfo[]> => {
		return typedInvokeUnwrap(AppsChannels.list);
	},
	openAppFolder: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppsChannels.openFolder, id);
	},
	deleteApp: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppsChannels.delete, id);
	},
	getAppsRoot: (): Promise<string> => {
		return typedInvokeUnwrap(AppsChannels.getRoot);
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
	updateSchedule: (
		scheduleId: string,
		patch: CronScheduleUpdateRequest
	): Promise<CronSchedule> => {
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
	runNow: (scheduleId: string): Promise<Task> => {
		return typedInvokeUnwrap(CronChannels.runNow, scheduleId);
	},
	action: (request: OpenClawCronToolRequest): Promise<OpenClawCronToolResponse> => {
		return typedInvokeUnwrap(CronChannels.action, request);
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

export const skills: SkillsApi = {
	list: () => {
		return typedInvokeUnwrap(SkillsChannels.list);
	},
	importSkill: () => {
		return typedInvokeUnwrap(SkillsChannels.import);
	},
	delete: (id: string): Promise<void> => {
		return typedInvokeUnwrap(SkillsChannels.delete, id);
	},
	getRoot: (): Promise<string> => {
		return typedInvokeUnwrap(SkillsChannels.getRoot);
	},
};

export const tasks: TasksApi = {
	createTask: (request: TaskCreateRequest): Promise<Task> => {
		return typedInvokeUnwrap(TaskChannels.create, request);
	},
	getTask: (taskId: TaskId): Promise<Task> => {
		return typedInvokeUnwrap(TaskChannels.get, taskId);
	},
	listTasks: (filter?: TaskListFilter): Promise<Task[]> => {
		return typedInvokeUnwrap(TaskChannels.list, filter);
	},
	cancelTask: (taskId: TaskId, reason?: string): Promise<void> => {
		return typedInvokeUnwrap(TaskChannels.cancel, taskId, reason);
	},
	retryTask: (taskId: TaskId): Promise<void> => {
		return typedInvokeUnwrap(TaskChannels.retry, taskId);
	},
	subscribeToTask: (taskId: TaskId, callback: (event: TaskEvent) => void): (() => void) => {
		return typedOn(TaskChannels.event, (event) => {
			if (event.taskId === taskId) callback(event);
		});
	},
	subscribeToTaskList: (_filter: TaskListFilter | undefined, callback: (event: TaskEvent) => void): (() => void) => {
		return typedOn(TaskChannels.event, callback);
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
	saveTelegramConfig: (
		config: TelegramChannelProperties
	): Promise<TelegramChannelProperties> => {
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
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('agent', agent);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
		contextBridge.exposeInMainWorld('skills', skills);
		contextBridge.exposeInMainWorld('tasks', tasks);
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
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
	// @ts-ignore (define in dts)
	globalThis.skills = skills;
	// @ts-ignore (define in dts)
	globalThis.tasks = tasks;
}
