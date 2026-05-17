import {
	AppWindow,
	CalendarClock,
	Info,
	Plug,
	RadioTower,
	Server,
	SlidersHorizontal,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';

export interface SettingsNavigationItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
}

export interface SettingsDetailItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey?: string;
	readonly keywords?: string;
}

export const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[] = [
	// General — permissions & folders
	{ path: '/settings/general', labelKey: 'settings.application.accessibility', descriptionKey: 'settings.application.accessibilityDescription', keywords: 'permission system' },
	{ path: '/settings/general', labelKey: 'settings.application.screenRecording', descriptionKey: 'settings.application.screenRecordingDescription', keywords: 'permission capture screen' },
	{ path: '/settings/general', labelKey: 'settings.application.menuBar', descriptionKey: 'settings.application.menuBarDescription', keywords: 'tray dock icon toggle' },
	{ path: '/settings/general', labelKey: 'settings.application.appData', descriptionKey: 'settings.application.appDataDescription', keywords: 'folder files storage' },
	{ path: '/settings/general', labelKey: 'settings.application.userData', descriptionKey: 'settings.application.userDataDescription', keywords: 'folder files storage' },
	// System — appearance
	{ path: '/settings/system', labelKey: 'settings.theme.title', descriptionKey: 'settings.theme.description', keywords: 'dark light color appearance mode' },
	{ path: '/settings/system', labelKey: 'settings.language.title', descriptionKey: 'settings.language.description', keywords: 'locale english italian i18n' },
	{ path: '/settings/system', labelKey: 'settings.translucency.title', descriptionKey: 'settings.translucency.description', keywords: 'blur opacity window backdrop vibrancy' },
	// Providers — API keys
	{ path: '/settings/providers', labelKey: 'settings.providers.keySaved', keywords: 'api key anthropic openai google' },
	{ path: '/settings/providers', labelKey: 'settings.providers.apiKeyPlaceholder', keywords: 'api key secret token' },
	// Channels
	{ path: '/settings/channels', labelKey: 'settings.channels.enabled', descriptionKey: 'settings.channels.enabledDescription', keywords: 'toggle on off activate' },
	{ path: '/settings/channels', labelKey: 'settings.channels.token', descriptionKey: 'settings.channels.tokenDescription', keywords: 'bot secret key telegram discord' },
	{ path: '/settings/channels', labelKey: 'settings.channels.dmPolicy', descriptionKey: 'settings.channels.dmPolicyDescription', keywords: 'allowlist open pairing deny direct message' },
	{ path: '/settings/channels', labelKey: 'settings.channels.allowFrom', descriptionKey: 'settings.channels.allowFromDescription', keywords: 'whitelist users allowed senders' },
	{ path: '/settings/channels', labelKey: 'settings.channels.status', keywords: 'connected disconnected runtime start stop' },
	// Skills
	{ path: '/settings/skills', labelKey: 'settings.skills.title', keywords: 'plugins import folder delete refresh' },
	// Apps
	{ path: '/settings/apps', labelKey: 'settings.apps.title', keywords: 'installed packages manifests folder delete' },
	// Cron
	{ path: '/settings/cron', labelKey: 'settings.sections.cron', keywords: 'schedule recurring task expression timezone' },
] as const;

export const SETTINGS_NAVIGATION = [
	{
		path: '/settings/general',
		labelKey: 'settings.tabs.general',
		descriptionKey: 'settings.overview.descriptions.general',
		icon: Info,
	},
	{
		path: '/settings/system',
		labelKey: 'settings.tabs.system',
		descriptionKey: 'settings.overview.descriptions.system',
		icon: SlidersHorizontal,
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.tabs.channels',
		descriptionKey: 'settings.overview.descriptions.channels',
		icon: RadioTower,
	},
	{
		path: '/settings/skills',
		labelKey: 'settings.tabs.skills',
		descriptionKey: 'settings.overview.descriptions.skills',
		icon: Sparkles,
	},
	{
		path: '/settings/connectors',
		labelKey: 'settings.tabs.connectors',
		descriptionKey: 'settings.overview.descriptions.connectors',
		icon: Plug,
	},
	{
		path: '/settings/providers',
		labelKey: 'settings.tabs.providers',
		descriptionKey: 'settings.overview.descriptions.providers',
		icon: Server,
	},
	{
		path: '/settings/cron',
		labelKey: 'settings.tabs.cron',
		descriptionKey: 'settings.overview.descriptions.cron',
		icon: CalendarClock,
	},
	{
		path: '/settings/apps',
		labelKey: 'settings.tabs.apps',
		descriptionKey: 'settings.overview.descriptions.apps',
		icon: AppWindow,
	},
] satisfies readonly SettingsNavigationItem[];
