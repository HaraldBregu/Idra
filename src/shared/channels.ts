import type {
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
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
}

export interface EventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}
