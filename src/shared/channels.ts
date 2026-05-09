// ---------------------------------------------------------------------------
// Shared IPC Channel Constants & Type Maps
// ---------------------------------------------------------------------------
// Single source of truth for all IPC channel names and their type signatures.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

import type {
	TaskAction,
	TaskInfo,
	TaskEvent,
	AppLogEntry,
	AppStartupInfo,
	AgentSettings,
	ThemeMode,
	CustomThemeInfo,
	CronJobInfo,
	CronTickEvent,
	Theme,
	ProviderEntry,
	ProviderModelInfo,
	UserProfile,
	Channel,
	ChannelType,
	ChannelStatusEvent,
	TelegramChannelProperties,
	WhatsappChannelProperties,
	DiscordChannelProperties,
} from './types';
import type { ShortcutId } from './shortcuts';

// ===========================================================================
// Channel Name Constants (grouped by domain)
// ===========================================================================

export const WindowChannels = {
	minimize: 'window:minimize',
	maximize: 'window:maximize',
	close: 'window:close',
	isMaximized: 'window:is-maximized',
	isFullScreen: 'window:is-fullscreen',
	maximizeChange: 'window:maximize-change',
	fullScreenChange: 'window:fullscreen-change',
	popupMenu: 'window:popup-menu',
} as const;

export const TaskChannels = {
	submit: 'task:submit',
	cancel: 'task:cancel',
	list: 'task:list',
	event: 'task:event',
} as const;

export const AssistantChannels = {
	send: 'assistant:send',
	reset: 'assistant:reset',
	response: 'assistant:response',
} as const;

export interface AssistantResponseEvent {
	assistantId: string;
	userMessage: string;
	response: string;
}

export const AppChannels = {
	setTheme: 'set-theme',
	setLanguage: 'set-language',
	changeLanguage: 'change-language',
	changeTheme: 'change-theme',
	fileOpened: 'file-opened',
	// Store / Provider management
	getProviders: 'app:get-providers',
	addProvider: 'app:add-provider',
	deleteProvider: 'app:delete-provider',
	getAgents: 'app:get-agents',
	updateAgent: 'app:update-agent',
	getStartupInfo: 'app:get-startup-info',
	getProfile: 'app:get-profile',
	setProfile: 'app:set-profile',
	completeFirstRunConfiguration: 'app:complete-first-run-configuration',
	getModels: 'app:get-models',
	// Channels (messaging adapters)
	getChannel: 'app:get-channel',
	setChannelProperties: 'app:set-channel-properties',
	getChannelStatus: 'app:get-channel-status',
	restartChannel: 'app:restart-channel',
	requestWhatsappPairingCode: 'app:request-whatsapp-pairing-code',
	channelStatusChanged: 'app:channel-status-changed',
	// Logs
	getLogs: 'app:get-logs',
	openLogsFolder: 'app:open-logs-folder',
	// App data folder
	openAppDataFolder: 'app:open-app-data-folder',
	// Theme management
	getCustomThemes: 'app:get-custom-themes',
	openThemesFolder: 'app:open-themes-folder',
	importTheme: 'app:import-theme',
	getCustomThemeTokens: 'app:get-custom-theme-tokens',
	deleteTheme: 'app:delete-theme',
	// System settings
	openSystemAccessibility: 'app:open-system-accessibility',
	openSystemScreenRecording: 'app:open-system-screen-recording',
	// Tray
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	// Cron jobs
	cronSchedule: 'app:cron-schedule',
	cronUnschedule: 'app:cron-unschedule',
	cronListJobs: 'app:cron-list-jobs',
	cronTick: 'app:cron-tick',
	// Global keyboard shortcuts (main → renderer)
	shortcut: 'app:shortcut',
	// Developer dialogs (main → renderer)
	openTasksDialog: 'app:open-tasks-dialog',
	openLogsDialog: 'app:open-logs-dialog',
	openReduxDialog: 'app:open-redux-dialog',
	openCronDialog: 'app:open-cron-dialog',
} as const;

// ===========================================================================
// Channel-to-Type Maps
// ===========================================================================
// These map each channel to its args (tuple) and result type.
// `result` represents the LOGICAL return type (T, not IpcResult<T>).
// The IpcResult wrapping is an implementation detail of the transport layer.

/**
 * Channels using ipcRenderer.invoke / ipcMain.handle.
 * `args` = tuple of arguments after the channel name.
 * `result` = the logical return type.
 */
export interface InvokeChannelMap {
	// ---- App / Provider management (IpcResult-wrapped) ----
	[AppChannels.getProviders]: { args: []; result: ProviderEntry[] };
	[AppChannels.addProvider]: { args: [provider: ProviderEntry]; result: ProviderEntry };
	[AppChannels.deleteProvider]: { args: [id: string]; result: void };
	[AppChannels.getAgents]: { args: []; result: AgentSettings[] };
	[AppChannels.updateAgent]: { args: [agent: AgentSettings]; result: AgentSettings };
	[AppChannels.getStartupInfo]: { args: []; result: AppStartupInfo };
	[AppChannels.getProfile]: { args: []; result: UserProfile | null };
	[AppChannels.setProfile]: { args: [profile: UserProfile]; result: UserProfile };
	[AppChannels.completeFirstRunConfiguration]: {
		args: [profile: UserProfile, providers: ProviderEntry[]];
		result: AppStartupInfo;
	};
	[AppChannels.getModels]: { args: [providerId: string]; result: ProviderModelInfo[] };
	[AppChannels.getChannel]: { args: []; result: Channel | null };
	[AppChannels.setChannelProperties]: {
		args: [
			type: ChannelType,
			properties:
				| TelegramChannelProperties
				| WhatsappChannelProperties
				| DiscordChannelProperties,
		];
		result: Channel;
	};
	[AppChannels.getChannelStatus]: {
		args: [];
		result: Partial<Record<ChannelType, ChannelStatusEvent>>;
	};
	[AppChannels.restartChannel]: { args: [type: ChannelType]; result: void };
	[AppChannels.requestWhatsappPairingCode]: {
		args: [phoneNumber: string];
		result: string;
	};
	// ---- Window (IpcResult-wrapped for handle, raw for others) ----
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };

	// ---- Task (IpcResult-wrapped via registerQuery/registerCommand) ----
	[TaskChannels.submit]: { args: [action: TaskAction]; result: { taskId: string } };
	[TaskChannels.cancel]: { args: [taskId: string]; result: boolean };
	[TaskChannels.list]: { args: []; result: TaskInfo[] };

	// ---- Logs (IpcResult-wrapped) ----
	[AppChannels.getLogs]: { args: [limit?: number]; result: AppLogEntry[] };
	[AppChannels.openLogsFolder]: { args: []; result: void };

	// ---- App data folder (IpcResult-wrapped) ----
	[AppChannels.openAppDataFolder]: { args: []; result: void };

	// ---- Theme management (IpcResult-wrapped) ----
	[AppChannels.getCustomThemes]: { args: []; result: CustomThemeInfo[] };
	[AppChannels.openThemesFolder]: { args: []; result: void };
	[AppChannels.importTheme]: { args: []; result: CustomThemeInfo | null };
	[AppChannels.getCustomThemeTokens]: { args: [id: string]; result: Theme | null };
	[AppChannels.deleteTheme]: { args: [id: string]; result: void };

	// ---- System settings (IpcResult-wrapped) ----
	[AppChannels.openSystemAccessibility]: { args: []; result: void };
	[AppChannels.openSystemScreenRecording]: { args: []; result: void };

	// ---- Tray (IpcResult-wrapped) ----
	[AppChannels.setTrayEnabled]: { args: [enabled: boolean]; result: void };
	[AppChannels.getTrayEnabled]: { args: []; result: boolean };

	// ---- Cron jobs (IpcResult-wrapped) ----
	[AppChannels.cronSchedule]: {
		args: [params: { id: string; expression: string; timezone?: string; runOnStart?: boolean }];
		result: CronJobInfo;
	};
	[AppChannels.cronUnschedule]: { args: [id: string]; result: void };
	[AppChannels.cronListJobs]: { args: []; result: CronJobInfo[] };

	// ---- Assistant (IpcResult-wrapped) ----
	[AssistantChannels.send]: { args: [message: string, assistantId?: string]; result: string };
	[AssistantChannels.reset]: { args: [assistantId?: string]; result: void };
}

/**
 * Channels using ipcRenderer.send / ipcMain.on (fire-and-forget).
 * `args` = tuple of arguments after the channel name.
 */
export interface SendChannelMap {
	[AppChannels.setTheme]: { args: [theme: ThemeMode] };
	[AppChannels.setLanguage]: { args: [language: string] };
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

/**
 * Channels for events pushed from main → renderer via webContents.send.
 * `data` = the payload sent with the event.
 */
export interface EventChannelMap {
	[AppChannels.changeLanguage]: { data: string };
	[AppChannels.changeTheme]: { data: ThemeMode };
	[AppChannels.fileOpened]: { data: string };
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
	[TaskChannels.event]: { data: TaskEvent };
	[AppChannels.shortcut]: { data: ShortcutId };
	[AppChannels.cronTick]: { data: CronTickEvent };
	[AppChannels.channelStatusChanged]: { data: ChannelStatusEvent };
	[AppChannels.openTasksDialog]: { data: undefined };
	[AppChannels.openLogsDialog]: { data: undefined };
	[AppChannels.openReduxDialog]: { data: undefined };
	[AppChannels.openCronDialog]: { data: undefined };
	[AssistantChannels.response]: { data: AssistantResponseEvent };
}
