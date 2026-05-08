import { contextBridge, webUtils } from 'electron';
import { typedInvoke, typedInvokeUnwrap, typedInvokeRaw, typedSend, typedOn } from './typed-ipc';
import {
	AppChannels,
	WindowChannels,
	WorkspaceChannels,
	TaskChannels,
	AssistantChannels,
} from '../shared/channels';
import type { AssistantResponseEvent } from '../shared/channels';
import type { AppApi, WindowApi, WorkspaceApi, TaskApi, AssistantApi } from './index.d';
import type {
	AgentSettings,
	Channel,
	ChannelType,
	ContextMenuDescriptor,
	CronJobInfo,
	CronTickEvent,
	Provider,
	TelegramChannelProperties,
	UserProfile,
	ThemeMode,
	WhatsappChannelProperties,
	DiscordChannelProperties,
	ChannelStatusEvent,
	WorkspaceInfo,
	CreateWorkspaceParams,
	DocumentConfig,
	EditorMaxWidthType,
	EditorFontType,
} from '../shared/types';
import type { ShortcutId } from '../shared/shortcuts';

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
	playSound: (): void => {
		typedSend(AppChannels.playSound);
	},
	setTheme: (theme: ThemeMode): void => {
		typedSend(AppChannels.setTheme, theme);
	},
	setLanguage: (language: string): void => {
		typedSend(AppChannels.setLanguage, language);
	},
	showContextMenu: (items: ContextMenuDescriptor[]): Promise<string | null> => {
		return typedInvoke(AppChannels.showContextMenu, items);
	},
	showContextMenuEditable: (): void => {
		typedSend(AppChannels.contextMenuEditable);
	},
	onLanguageChange: (callback: (lng: string) => void): (() => void) => {
		return typedOn(AppChannels.changeLanguage, callback);
	},
	onThemeChange: (callback: (theme: ThemeMode) => void): (() => void) => {
		return typedOn(AppChannels.changeTheme, callback);
	},
	onFileOpened: (callback: (filePath: string) => void): (() => void) => {
		return typedOn(AppChannels.fileOpened, callback);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	getPlatform: (): Promise<string> => {
		return typedInvoke(WindowChannels.getPlatform);
	},
	showWriting: (writingId: string, writingTitle: string): Promise<void> => {
		return typedInvoke(AppChannels.showWritingContextMenu, writingId, writingTitle);
	},
	onWritingAction: (
		callback: (data: { action: string; writingId: string }) => void
	): (() => void) => {
		return typedOn(AppChannels.writingContextMenuAction, callback);
	},
	// -------------------------------------------------------------------------
	// Provider management
	// -------------------------------------------------------------------------
	getProviders: (): Promise<Provider[]> => {
		return typedInvokeUnwrap(AppChannels.getProviders);
	},
	addProvider: (provider: Provider): Promise<Provider> => {
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
	completeFirstRunConfiguration: (profile: UserProfile, providers: Provider[]) => {
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
	getAppDataFolder: () => typedInvokeUnwrap(AppChannels.getAppDataFolder),
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
	cronHasJob: (id: string): Promise<boolean> => typedInvokeUnwrap(AppChannels.cronHasJob, id),
	onCronTick: (callback: (event: CronTickEvent) => void): (() => void) => {
		return typedOn(AppChannels.cronTick, callback);
	},
	getPathForFile: (file: File): string => webUtils.getPathForFile(file),
	onShortcut: (callback: (id: ShortcutId) => void): (() => void) => {
		return typedOn(AppChannels.shortcut, callback);
	},
	onOpenTasksDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openTasksDialog, callback);
	},
	onOpenLogsDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openLogsDialog, callback);
	},
	onOpenReduxDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openReduxDialog, callback);
	},
	onOpenCronDialog: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.openCronDialog, callback);
	},
};

// ---------------------------------------------------------------------------
// window.workspace — Workspace folder selection, documents, directories, output
// ---------------------------------------------------------------------------
const workspace: WorkspaceApi = {
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
	clear: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.clear);
	},
	onChange: (
		callback: (event: { currentPath: string | null; previousPath: string | null }) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.changed, callback);
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
	openResourcesFolder: (): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openResourcesFolder);
	},
	openDocumentFolder: (documentId: string): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.openDocumentFolder, documentId);
	},
	getDocumentPath: (documentId: string): Promise<string> => {
		return typedInvokeUnwrap(WorkspaceChannels.getDocumentPath, documentId);
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
	loadOutputs: () => {
		return typedInvokeUnwrap(WorkspaceChannels.outputLoadAll);
	},
	loadOutputsByType: (type: string) => {
		return typedInvokeUnwrap(WorkspaceChannels.loadByType, type);
	},
	loadOutput: (params: { type: string; id: string }) => {
		return typedInvokeUnwrap(WorkspaceChannels.outputLoadOne, params);
	},
	deleteOutput: (params: { type: string; id: string }): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputDelete, params);
	},
	trashOutput: (params: { type: string; id: string }): Promise<void> => {
		return typedInvokeUnwrap(WorkspaceChannels.outputTrash, params);
	},
	onOutputFileChange: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			outputType: string;
			fileId: string;
			filePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.outputFileChanged, callback);
	},
	// -------------------------------------------------------------------------
	// Project workspace (workspace.json `project` block)
	// -------------------------------------------------------------------------
	getProjectInfo: () => typedInvokeUnwrap(WorkspaceChannels.getProjectInfo),
	updateProjectName: (name: string) => typedInvokeUnwrap(WorkspaceChannels.updateProjectName, name),
	updateProjectDescription: (description: string) =>
		typedInvokeUnwrap(WorkspaceChannels.updateProjectDescription, description),
	updateMaxWidthType: (value: EditorMaxWidthType) =>
		typedInvokeUnwrap(WorkspaceChannels.updateMaxWidthType, value),
	updateTextSize: (percentage: number) =>
		typedInvokeUnwrap(WorkspaceChannels.updateTextSize, percentage),
	updateFontType: (value: EditorFontType) =>
		typedInvokeUnwrap(WorkspaceChannels.updateFontType, value),
	// -------------------------------------------------------------------------
	// Document config
	// -------------------------------------------------------------------------
	getDocumentConfig: (documentId: string) =>
		typedInvokeUnwrap(WorkspaceChannels.getDocumentConfig, documentId),
	updateDocumentConfig: (documentId: string, config: Partial<DocumentConfig>) =>
		typedInvokeUnwrap(WorkspaceChannels.updateDocumentConfig, documentId, config),
	onDocumentConfigChanges: (
		documentId: string,
		callback: (config: DocumentConfig) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.documentConfigChanged, (event) => {
			if (event.documentId === documentId) {
				callback(event.config);
			}
		});
	},
	// -------------------------------------------------------------------------
	// Document content
	// -------------------------------------------------------------------------
	getDocumentContent: (documentId: string) =>
		typedInvokeUnwrap(WorkspaceChannels.getDocumentContent, documentId),
	updateDocumentContent: (documentId: string, content: string) =>
		typedInvokeUnwrap(WorkspaceChannels.updateDocumentContent, documentId, content),
	// -------------------------------------------------------------------------
	// Resources (workspace/resources/)
	// -------------------------------------------------------------------------
	getResources: () => typedInvokeUnwrap(WorkspaceChannels.getResources),
	insertResources: (extensions?: string[]) =>
		typedInvokeUnwrap(WorkspaceChannels.insertResources, extensions),
	deleteResource: (id: string) => typedInvokeUnwrap(WorkspaceChannels.deleteResource, id),
	onResourcesChanged: (
		callback: (event: {
			type: 'added' | 'changed' | 'removed';
			resourceId: string;
			resourcePath: string;
			timestamp: number;
		}) => void
	): (() => void) => {
		return typedOn(WorkspaceChannels.resourcesChanged, callback);
	},
	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------
	readFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsReadFile, params),
	readFileBinary: (filePath) => typedInvokeUnwrap(WorkspaceChannels.fsReadFileBinary, filePath),
	writeFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsWriteFile, params),
	createFolder: (params) => typedInvokeUnwrap(WorkspaceChannels.fsCreateFolder, params),
	deleteFolder: (params) => typedInvokeUnwrap(WorkspaceChannels.fsDeleteFolder, params),
	deleteFile: (params) => typedInvokeUnwrap(WorkspaceChannels.fsDeleteFile, params),
	rename: (params) => typedInvokeUnwrap(WorkspaceChannels.fsRename, params),
	listDir: (params) => typedInvokeUnwrap(WorkspaceChannels.fsListDir, params),
} satisfies WorkspaceApi;

// ---------------------------------------------------------------------------
// window.task — Background task queue
// ---------------------------------------------------------------------------
const task: TaskApi = {
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
} satisfies TaskApi;

// ---------------------------------------------------------------------------
// window.assistant — Conversational AI assistant
// ---------------------------------------------------------------------------
const assistant: AssistantApi = {
	send: (message: string, assistantId?: string): Promise<string> => {
		return typedInvokeUnwrap(AssistantChannels.send, message, assistantId);
	},
	reset: (assistantId?: string): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.reset, assistantId);
	},
	onResponse: (callback: (event: AssistantResponseEvent) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
} satisfies AssistantApi;

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
