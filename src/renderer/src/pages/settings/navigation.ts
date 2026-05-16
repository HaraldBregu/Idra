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
