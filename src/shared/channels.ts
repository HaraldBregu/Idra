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
	UserProfile,
	Channel,
	ChannelType,
	ChannelStatusEvent,
	TelegramChannelProperties,
	WhatsappChannelProperties,
	DiscordChannelProperties,
	AssistantAiSelection,
	AssistantAiSettings,
} from './types';
import type { ShortcutId } from './shortcuts';

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

interface AppInvokeChannelMap {
	'app:get-assistant-ai-settings': { args: []; result: AssistantAiSettings };
	'app:set-assistant-ai-provider-api-key': {
		args: [providerId: string, apiKey: string];
		result: AssistantAiSettings;
	};
	'app:set-assistant-ai-selection': {
		args: [selection: AssistantAiSelection];
		result: AssistantAiSettings;
	};
	// ---- App / Provider management (IpcResult-wrapped) ----
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		WindowInvokeChannelMap {}

export interface SendChannelMap {
	'set-theme': { args: [theme: ThemeMode] };
	'set-language': { args: [language: string] };
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

export interface EventChannelMap {
	'change-language': { data: string };
	'change-theme': { data: ThemeMode };
	'file-opened': { data: string };
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
	'task:event': { data: TaskEvent };
	'app:shortcut': { data: ShortcutId };
	'app:cron-tick': { data: CronTickEvent };
	'app:channel-status-changed': { data: ChannelStatusEvent };
	'app:open-tasks-dialog': { data: undefined };
	'app:open-logs-dialog': { data: undefined };
	'app:open-redux-dialog': { data: undefined };
	'app:open-cron-dialog': { data: undefined };
	'assistant:response': {
		data: { assistantId: string; userMessage: string; response: string };
	};
}
