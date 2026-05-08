// ---------------------------------------------------------------------------
// Preload API Type Declarations
// ---------------------------------------------------------------------------
// These declarations extend the browser's global Window interface so that
// renderer code can access window.app, window.win, etc. with full type safety.
//
// The interface Window block MUST live inside `declare global` so TypeScript
// treats this as a module-augmentation rather than a standalone interface
// declaration.  Without `declare global` the renderer tsconfig (which includes
// this file as a global type) cannot merge it into `Window & typeof globalThis`.
// ---------------------------------------------------------------------------

import type {
	WorkspaceInfo,
	WorkspaceDeletedEvent,
	CreateWorkspaceParams,
	TaskAction,
	TaskActionReturn,
	TaskInfo,
	TaskEvent,
	SaveOutputInput,
	SaveOutputResult,
	ProjectWorkspaceInfo,
	AppLogEntry,
	AppStartupInfo,
	AgentSettings,
	IpcResult,
	ProviderEntry,
	ProviderModelInfo,
	UserProfile,
	ThemeMode,
	CustomThemeInfo,
	CronJobInfo,
	CronTickEvent,
	Theme,
	Channel,
	ChannelType,
	ChannelStatusEvent,
	DiscordChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../shared/types';
import type { AssistantResponseEvent } from '../shared/channels';

// ---------------------------------------------------------------------------
// Re-export shared types so renderer code can import them from the preload
// declaration rather than reaching into the shared directory directly.
// ---------------------------------------------------------------------------
export type {
	WorkspaceInfo,
	WorkspaceDeletedEvent,
	CreateWorkspaceParams,
	TaskAction,
	TaskActionReturn,
	TaskInfo,
	TaskEvent,
	SaveOutputInput,
	SaveOutputResult,
	IpcResult,
	ProjectWorkspaceInfo,
	ProviderEntry,
	ProviderModelInfo,
	AppLogEntry,
	AppStartupInfo,
	AgentSettings,
	ThemeMode,
	CustomThemeInfo,
	Theme,
	Channel,
	ChannelType,
	ChannelStatusEvent,
	DiscordChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
};

// ---------------------------------------------------------------------------
// API namespace interfaces
// ---------------------------------------------------------------------------

/** Window controls (minimize / maximize / close / fullscreen) */
export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

/** General application utilities. Additional IPC namespaces are grouped under this object. */
export interface AppApi {
	workspace: {
		getCurrent: () => Promise<string | null>;
		setCurrent: (workspacePath: string) => Promise<void>;
		/** List every managed workspace, sorted most-recently-opened first. */
		list: () => Promise<WorkspaceInfo[]>;
		/** Create a new managed workspace and return its WorkspaceInfo. */
		create: (params: CreateWorkspaceParams) => Promise<WorkspaceInfo>;
		/** Subscribe to workspace deletion events (folder deleted/moved while app is open) */
		onDeleted: (callback: (event: WorkspaceDeletedEvent) => void) => () => void;
		// -------------------------------------------------------------------------
		// Shell
		// -------------------------------------------------------------------------
		/** Open the current workspace root folder in the system file explorer. */
		openWorkspaceFolder: () => Promise<void>;
		// -------------------------------------------------------------------------
		// Output file management (documents)
		// -------------------------------------------------------------------------
		saveOutput: (input: SaveOutputInput) => Promise<SaveOutputResult>;
		// -------------------------------------------------------------------------
		// Project workspace (workspace.json `project` block)
		// -------------------------------------------------------------------------
		/** Get the project workspace info, or null if no workspace is set. */
		getProjectInfo: () => Promise<ProjectWorkspaceInfo | null>;
		/** Update the project name. */
		updateProjectName: (name: string) => Promise<ProjectWorkspaceInfo>;
		/** Update the project description. */
		updateProjectDescription: (description: string) => Promise<ProjectWorkspaceInfo>;
	};
	task: {
		submit: (action: TaskAction) => Promise<IpcResult<TaskActionReturn>>;
		cancel: (taskId: string) => Promise<IpcResult<boolean>>;
		list: () => Promise<IpcResult<TaskInfo[]>>;
		onEvent: (callback: (event: TaskEvent) => void) => () => void;
	};
	assistant: {
		/** Send a message to an assistant. Defaults to the 'main' assistant. */
		send: (message: string, assistantId?: string) => Promise<string>;
		/** Reset an assistant's conversation history. */
		reset: (assistantId?: string) => Promise<void>;
		/** Subscribe to assistant responses (fires every time a reply lands). */
		onResponse: (callback: (event: AssistantResponseEvent) => void) => () => void;
	};
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: string) => void;
	onLanguageChange: (callback: (lng: string) => void) => () => void;
	onThemeChange: (callback: (theme: ThemeMode) => void) => () => void;
	popupMenu: () => void;
	/** Send a message to the assistant agent. Defaults to the 'main' assistant. */
	callAssistantAgent: (message: string, assistantId?: string) => Promise<string>;
	// ---------------------------------------------------------------------------
	// Provider management
	// ---------------------------------------------------------------------------
	getProviders: () => Promise<ProviderEntry[]>;
	addProvider: (provider: ProviderEntry) => Promise<ProviderEntry>;
	deleteProvider: (id: string) => Promise<void>;
	getAgents: () => Promise<AgentSettings[]>;
	updateAgent: (agent: AgentSettings) => Promise<AgentSettings>;
	getStartupInfo: () => Promise<AppStartupInfo>;
	/** Get the persisted user profile, or null if not set. */
	getProfile: () => Promise<UserProfile | null>;
	/** Persist the user profile (first/last name). */
	setProfile: (profile: UserProfile) => Promise<UserProfile>;
	completeFirstRunConfiguration: (profile: UserProfile, providers: ProviderEntry[]) => Promise<AppStartupInfo>;
	/** Fetch the available models from a provider's `/models` endpoint using the stored API key. */
	getModels: (providerId: string) => Promise<ProviderModelInfo[]>;
	/** Get the persisted messaging channel configuration, or null if not set. */
	getChannel: () => Promise<Channel | null>;
	/** Set the token + allowFrom properties for a single channel provider. */
	setChannelProperties: <K extends ChannelType>(
		type: K,
		properties: K extends 'telegram'
			? TelegramChannelProperties
			: K extends 'whatsapp'
				? WhatsappChannelProperties
				: DiscordChannelProperties
	) => Promise<Channel>;
	/** Get current connection status for each channel adapter. */
	getChannelStatus: () => Promise<Partial<Record<ChannelType, ChannelStatusEvent>>>;
	/** Stop and re-start the adapter for the given channel type. */
	restartChannel: (type: ChannelType) => Promise<void>;
	/**
	 * Persist the WhatsApp phone number, (re)start the adapter, and resolve
	 * with the pairing code emitted by Baileys. Rejects on error or timeout.
	 */
	requestWhatsappPairingCode: (phoneNumber: string) => Promise<string>;
	/** Subscribe to channel connection status updates. */
	onChannelStatus: (callback: (event: ChannelStatusEvent) => void) => () => void;
	/** Fetch the most recent log entries from the main-process ring buffer. `limit` defaults to 200, max 1000. */
	getLogs: (limit?: number) => Promise<AppLogEntry[]>;
	/** Open the application logs folder in the system file explorer. */
	openLogsFolder: () => Promise<void>;
	/** Open the application user-data folder in the system file explorer. */
	openAppDataFolder: () => Promise<void>;
	/** Get all installed custom themes from the themes folder. */
	getCustomThemes: () => Promise<CustomThemeInfo[]>;
	/** Open the themes folder in the system file explorer. */
	openThemesFolder: () => Promise<void>;
	/** Open a folder picker to import a theme; returns the imported theme info, or null if cancelled. */
	importTheme: () => Promise<CustomThemeInfo | null>;
	/** Get the full theme manifest (including light/dark tokens) for a custom theme by its folder ID. */
	getCustomThemeTokens: (id: string) => Promise<Theme | null>;
	/** Delete a custom theme by its folder ID. */
	deleteTheme: (id: string) => Promise<void>;
	/** Open the macOS System Preferences > Accessibility pane. */
	openSystemAccessibility: () => Promise<void>;
	/** Open the macOS System Preferences > Screen Recording pane. */
	openSystemScreenRecording: () => Promise<void>;
	/** Enable or disable the menu bar tray icon. */
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	/** Check whether the menu bar tray icon is currently enabled. */
	getTrayEnabled: () => Promise<boolean>;
	/** Schedule a recurring cron job. Renderer receives ticks via `onCronTick`. */
	cronSchedule: (params: {
		id: string;
		expression: string;
		timezone?: string;
		runOnStart?: boolean;
	}) => Promise<CronJobInfo>;
	/** Stop and remove a scheduled cron job by id. */
	cronUnschedule: (id: string) => Promise<void>;
	/** List all currently scheduled cron jobs. */
	cronListJobs: () => Promise<CronJobInfo[]>;
	/** Subscribe to cron tick events. Fires for any scheduled job each time it runs. */
	onCronTick: (callback: (event: CronTickEvent) => void) => () => void;
	/** Subscribe to open-tasks-dialog events emitted from the Developer menu. */
	onOpenTasksDialog: (callback: () => void) => () => void;
	/** Subscribe to open-logs-dialog events emitted from the Developer menu. */
	onOpenLogsDialog: (callback: () => void) => () => void;
	/** Subscribe to open-cron-dialog events emitted from the Developer menu. */
	onOpenCronDialog: (callback: () => void) => () => void;
}




// ---------------------------------------------------------------------------
// Global Window augmentation
// ---------------------------------------------------------------------------
// IMPORTANT: This must be inside `declare global` so TypeScript can merge
// it with the built-in Window interface in renderer code.
// ---------------------------------------------------------------------------

declare global {
	interface Window {
		/** Optional: not present in all window types */
		win?: WindowApi;
		app: AppApi;
	}
}
