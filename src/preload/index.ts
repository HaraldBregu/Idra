import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc';
import {
	AppChannels,
	WindowChannels,
	WorkspaceChannels,
	TaskChannels,
	AssistantChannels,
} from '../shared/channels';
import type { AssistantResponseEvent } from '../shared/channels';
import type { AppApi, WindowApi } from './index.d';
import type {
	AgentSettings,
	Channel,
	ChannelType,
	CronJobInfo,
	CronTickEvent,
	TelegramChannelProperties,
	UserProfile,
	ThemeMode,
	WhatsappChannelProperties,
	DiscordChannelProperties,
	ChannelStatusEvent,
	WorkspaceInfo,
	CreateWorkspaceParams,
	ProviderEntry,
} from '../shared/types';

// ---------------------------------------------------------------------------
// window.win — Window controls
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// window.app — General application utilities + nested IPC namespaces
// ---------------------------------------------------------------------------
const baseApp = {
	setTheme: (theme: ThemeMode): void => {
		typedSend(AppChannels.setTheme, theme);
	},
	setLanguage: (language: string): void => {
		typedSend(AppChannels.setLanguage, language);
	},
	onLanguageChange: (callback: (lng: string) => void): (() => void) => {
		return typedOn(AppChannels.changeLanguage, callback);
	},
	onThemeChange: (callback: (theme: ThemeMode) => void): (() => void) => {
		return typedOn(AppChannels.changeTheme, callback);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	callAssistantAgent: (message: string, assistantId?: string): Promise<string> => {
		return typedInvokeUnwrap(AssistantChannels.send, message, assistantId);
	},
	// -------------------------------------------------------------------------
	// Provider management
	// -------------------------------------------------------------------------
	getProviders: (): Promise<ProviderEntry[]> => {
		return typedInvokeUnwrap(AppChannels.getProviders);
	},
	addProvider: (provider: ProviderEntry): Promise<ProviderEntry> => {
		return typedInvokeUnwrap(AppChannels.addProvider, provider);
	},
	deleteProvider: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.deleteProvider, id);
	},
	getAgents: (): Promise<AgentSettings[]> => {
		return typedInvokeUnwrap(AppChannels.getAgents);
	},
	updateAgent: (agent: AgentSettings): Promise<AgentSettings> => {
		return typedInvokeUnwrap(AppChannels.updateAgent, agent);
	},
	getStartupInfo: () => {
		return typedInvokeUnwrap(AppChannels.getStartupInfo);
	},
	getProfile: () => {
		return typedInvokeUnwrap(AppChannels.getProfile);
	},
	setProfile: (profile: UserProfile) => {
		return typedInvokeUnwrap(AppChannels.setProfile, profile);
	},
	completeFirstRunConfiguration: (profile: UserProfile, providers: ProviderEntry[]) => {
		return typedInvokeUnwrap(AppChannels.completeFirstRunConfiguration, profile, providers);
	},
	getModels: (providerId: string) => typedInvokeUnwrap(AppChannels.getModels, providerId),
	getChannel: (): Promise<Channel | null> => typedInvokeUnwrap(AppChannels.getChannel),
	setChannelProperties: <K extends ChannelType>(
		type: K,
		properties: K extends 'telegram'
			? TelegramChannelProperties
			: K extends 'whatsapp'
				? WhatsappChannelProperties
				: DiscordChannelProperties
	): Promise<Channel> =>
		typedInvokeUnwrap(
			AppChannels.setChannelProperties,
			type,
			properties as
				| TelegramChannelProperties
				| WhatsappChannelProperties
				| DiscordChannelProperties
		),
	getChannelStatus: (): Promise<Partial<Record<ChannelType, ChannelStatusEvent>>> =>
		typedInvokeUnwrap(AppChannels.getChannelStatus),
	restartChannel: (type: ChannelType): Promise<void> =>
		typedInvokeUnwrap(AppChannels.restartChannel, type),
	requestWhatsappPairingCode: (phoneNumber: string): Promise<string> =>
		typedInvokeUnwrap(AppChannels.requestWhatsappPairingCode, phoneNumber),
	onChannelStatus: (callback: (event: ChannelStatusEvent) => void): (() => void) => {
		return typedOn(AppChannels.channelStatusChanged, callback);
	},
	getLogs: (limit?: number) => typedInvokeUnwrap(AppChannels.getLogs, limit),
	openLogsFolder: () => typedInvokeUnwrap(AppChannels.openLogsFolder),
	openAppDataFolder: () => typedInvokeUnwrap(AppChannels.openAppDataFolder),
	getCustomThemes: () => typedInvokeUnwrap(AppChannels.getCustomThemes),
	openThemesFolder: () => typedInvokeUnwrap(AppChannels.openThemesFolder),
	importTheme: () => typedInvokeUnwrap(AppChannels.importTheme),
	getCustomThemeTokens: (id: string) => typedInvokeUnwrap(AppChannels.getCustomThemeTokens, id),
	deleteTheme: (id: string) => typedInvokeUnwrap(AppChannels.deleteTheme, id),
	openSystemAccessibility: () => typedInvokeUnwrap(AppChannels.openSystemAccessibility),
	openSystemScreenRecording: () => typedInvokeUnwrap(AppChannels.openSystemScreenRecording),
	setTrayEnabled: (enabled: boolean) => typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled),
	getTrayEnabled: () => typedInvokeUnwrap(AppChannels.getTrayEnabled),
	cronSchedule: (params: {
		id: string;
		expression: string;
		timezone?: string;
		runOnStart?: boolean;
	}): Promise<CronJobInfo> => typedInvokeUnwrap(AppChannels.cronSchedule, params),
	cronUnschedule: (id: string): Promise<void> => typedInvokeUnwrap(AppChannels.cronUnschedule, id),
	cronListJobs: (): Promise<CronJobInfo[]> => typedInvokeUnwrap(AppChannels.cronListJobs),
	onCronTick: (callback: (event: CronTickEvent) => void): (() => void) => {
		return typedOn(AppChannels.cronTick, callback);
	},
	onOpenTasksDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openTasksDialog, callback);
	},
	onOpenLogsDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openLogsDialog, callback);
	},
	onOpenCronDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openCronDialog, callback);
	},
};

// ---------------------------------------------------------------------------
// window.app.workspace — Workspace folder selection, documents, directories, output
// ---------------------------------------------------------------------------
const workspace: AppApi['workspace'] = {
	getCurrent: (): Promise<string | null> => {
		return typedInvokeUnwrap(WorkspaceChannels.getCurrent);
	},
	setCurrent: (workspacePath: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.setCurrent, workspacePath);
	},
	list: (): Promise<WorkspaceInfo[]> => {
		return typedInvokeUnwrap(WorkspaceChannels.list);
	},
	create: (params: CreateWorkspaceParams): Promise<WorkspaceInfo> => {
		return typedInvokeUnwrap(WorkspaceChannels.create, params);
	},
	onDeleted: (
		callback: (event: {
			deletedPath: string;
			reason: 'deleted' | 'inaccessible' | 'renamed';
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.deleted, callback);
	},
	// -------------------------------------------------------------------------
	// Shell
	// -------------------------------------------------------------------------
	openWorkspaceFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openWorkspaceFolder);
	},
	// -------------------------------------------------------------------------
	// Output file management (documents)
	// -------------------------------------------------------------------------
	saveOutput: (input: {
		type: string;
		content: string;
		metadata?: Record<string, unknown>;
	}): Promise<{ id: string; path: string; savedAt: number }> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputSave, input);
	},
	// -------------------------------------------------------------------------
	// Project workspace (workspace.json `project` block)
	// -------------------------------------------------------------------------
	getProjectInfo: () => typedInvokeUnwrap(WorkspaceChannels.getProjectInfo),
	updateProjectName: (name: string) => typedInvokeUnwrap(WorkspaceChannels.updateProjectName, name),
	updateProjectDescription: (description: string) =>
		typedInvokeUnwrap(WorkspaceChannels.updateProjectDescription, description),
} satisfies AppApi['workspace'];

// ---------------------------------------------------------------------------
// window.app.task — Background task queue
// ---------------------------------------------------------------------------
const task: AppApi['task'] = {
	submit: (action) => {
		return typedInvokeRaw(TaskChannels.submit, action);
	},
	cancel: (taskId: string) => {
		return typedInvokeRaw(TaskChannels.cancel, taskId);
	},
	list: () => {
		return typedInvokeRaw(TaskChannels.list);
	},
	onEvent: (callback) => {
		return typedOn(TaskChannels.event, callback);
	},
} satisfies AppApi['task'];

// ---------------------------------------------------------------------------
// window.app.assistant — Conversational AI assistant
// ---------------------------------------------------------------------------
const assistant: AppApi['assistant'] = {
	send: (message: string, assistantId?: string): Promise<string> => {
		return typedInvokeUnwrap(AssistantChannels.send, message, assistantId);
	},
	reset: (assistantId?: string): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.reset, assistantId);
	},
	onResponse: (callback: (event: AssistantResponseEvent) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
} satisfies AppApi['assistant'];

const app: AppApi = {
	...baseApp,
	workspace,
	task,
	assistant,
};

// ---------------------------------------------------------------------------
// Registration — expose supported namespaces via contextBridge
// ---------------------------------------------------------------------------
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
}
