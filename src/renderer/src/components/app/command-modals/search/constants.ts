import {
	Bot,
	Code2,
	FileText,
	FolderOpen,
	LibraryBig,
	MonitorCog,
	Palette,
	Pencil,
	Plug,
	Radio,
	Settings,
	Sparkles,
	User,
	Briefcase,
} from 'lucide-react';
import type { AppSearchActionDefinition } from './types';

export const APP_SEARCH_RESULTS_PER_SECTION = 6;

export const APP_SEARCH_RESULT_KIND_LABELS = {
	action: 'Action',
	document: 'Document',
	resource: 'Resource',
} as const;

export const APP_SEARCH_ACTIONS: AppSearchActionDefinition[] = [
	{
		id: 'welcome',
		title: 'Open Welcome',
		description: 'Go to the workspace landing page.',
		href: '/',
		icon: FileText,
		meta: 'Route',
	},
	{
		id: 'settings-general',
		title: 'Open Settings · General',
		description: 'General app preferences and language.',
		href: '/settings/general',
		icon: Settings,
		meta: 'Settings',
	},
	{
		id: 'settings-account',
		title: 'Open Settings · Account',
		description: 'Manage account profile and credentials.',
		href: '/settings/account',
		icon: User,
		meta: 'Settings',
	},
	{
		id: 'settings-workspace',
		title: 'Open Settings · Workspace',
		description: 'Configure workspace paths and behavior.',
		href: '/settings/workspace',
		icon: Briefcase,
		meta: 'Settings',
	},
	{
		id: 'settings-editor',
		title: 'Open Settings · Editor',
		description: 'Editor appearance, fonts, and behavior.',
		href: '/settings/editor',
		icon: Pencil,
		meta: 'Settings',
	},
	{
		id: 'settings-themes',
		title: 'Open Settings · Themes',
		description: 'Switch theme and accent colors.',
		href: '/settings/themes',
		icon: Palette,
		meta: 'Settings',
	},
	{
		id: 'settings-agents',
		title: 'Open Settings · Agents',
		description: 'Configure AI agents and their tools.',
		href: '/settings/agents',
		icon: Bot,
		meta: 'Settings',
	},
	{
		id: 'settings-providers',
		title: 'Open Settings · Providers',
		description: 'Manage LLM providers and API keys.',
		href: '/settings/providers',
		icon: Plug,
		meta: 'Settings',
	},
	{
		id: 'settings-channels',
		title: 'Open Settings · Channels',
		description: 'Manage delivery channels and integrations.',
		href: '/settings/channels',
		icon: Radio,
		meta: 'Settings',
	},
	{
		id: 'settings-assistant',
		title: 'Open Settings · Assistant',
		description: 'Chat with the AI assistant.',
		href: '/settings/assistant',
		icon: Sparkles,
		meta: 'Settings',
	},
	{
		id: 'settings-system',
		title: 'Open Settings · System',
		description: 'System-level settings and updates.',
		href: '/settings/system',
		icon: MonitorCog,
		meta: 'Settings',
	},
	{
		id: 'settings-developer',
		title: 'Open Settings · Developer',
		description: 'Developer tools and diagnostics.',
		href: '/settings/developer',
		icon: Code2,
		meta: 'Settings',
	},
];

export const APP_SEARCH_SECTION_ICONS = {
	actions: Sparkles,
	documents: FolderOpen,
	resources: LibraryBig,
} as const;
