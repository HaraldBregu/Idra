import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	AppWindow,
	Bot,
	BotMessageSquare,
	CalendarClock,
	Home,
	Info,
	KeyRound,
	Plug,
	Search,
	Server,
	Settings,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from '@/components/ui/command';
import { SETTINGS_DETAIL_ITEMS, SETTINGS_NAVIGATION } from '@/pages/settings/navigation';

interface AppRouteItem {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly group: string;
	readonly icon: LucideIcon;
	readonly path: string;
	readonly searchValue: string;
	readonly keywords: string[];
}

interface AppRouteGroup {
	readonly heading: string;
	readonly items: AppRouteItem[];
}

interface StaticRouteDefinition {
	readonly id: string;
	readonly label: string;
	readonly description: string;
	readonly icon: LucideIcon;
	readonly path: string;
	readonly keywords: string;
}

const TOP_LEVEL_ROUTES: readonly StaticRouteDefinition[] = [
	{
		id: 'route-home',
		label: 'Home',
		description: 'Chat with Friday',
		icon: Home,
		path: '/home',
		keywords: 'chat agent ai assistant friday',
	},
	{
		id: 'route-start',
		label: 'Set up Friday',
		description: 'Connect provider tokens',
		icon: KeyRound,
		path: '/start',
		keywords: 'setup onboarding providers api token config first time',
	},
	{
		id: 'route-settings',
		label: 'Settings',
		description: 'Configure Friday',
		icon: Settings,
		path: '/settings',
		keywords: 'preferences configuration settings',
	},
] as const;

const SETTINGS_ROUTE_ICONS = {
	'/settings/general': Info,
	'/settings/providers': Server,
	'/settings/agents': Bot,
	'/settings/skills': Sparkles,
	'/settings/connectors': Plug,
	'/settings/channels': BotMessageSquare,
	'/settings/cron': CalendarClock,
	'/settings/apps': AppWindow,
} as const satisfies Partial<Record<string, LucideIcon>>;

function toKeywords(...values: Array<string | undefined>): string[] {
	const seen = new Set<string>();
	const keywords: string[] = [];

	for (const value of values) {
		for (const token of (value ?? '').toLowerCase().split(/[\s/._:-]+/)) {
			if (!token || seen.has(token)) continue;
			seen.add(token);
			keywords.push(token);
		}
	}

	return keywords;
}

function createCommandItem({
	id,
	label,
	description,
	group,
	icon,
	path,
	keywords,
}: Omit<AppRouteItem, 'searchValue' | 'keywords'> & {
	readonly keywords?: string;
}): AppRouteItem {
	const keywordList = toKeywords(id, label, description, group, path, keywords);

	return {
		id,
		label,
		description,
		group,
		icon,
		path,
		keywords: keywordList,
		searchValue: [id, label, description, group, path, keywords].filter(Boolean).join(' '),
	};
}

function buildCommandGroups(t: TFunction): AppRouteGroup[] {
	const routesHeading = t('command.groups.routes', 'Routes');
	const settingsRoutesHeading = t('command.groups.settingsRoutes', 'Settings routes');
	const settingsItemsHeading = t('command.groups.settingsItems', 'Settings items');

	const routes = TOP_LEVEL_ROUTES.map((route) =>
		createCommandItem({
			...route,
			group: routesHeading,
		})
	);

	const settingsRoutes = SETTINGS_NAVIGATION.map((item) =>
		createCommandItem({
			id: `settings-route-${item.path}`,
			label: t(item.labelKey),
			description: t(item.descriptionKey),
			group: settingsRoutesHeading,
			icon: item.icon,
			path: item.path,
			keywords: item.path,
		})
	);

	const settingsItems = SETTINGS_DETAIL_ITEMS.map((item, index) =>
		createCommandItem({
			id: `settings-item-${index}-${item.path}`,
			label: t(item.labelKey),
			description: item.descriptionKey ? t(item.descriptionKey) : undefined,
			group: settingsItemsHeading,
			icon: SETTINGS_ROUTE_ICONS[item.path as keyof typeof SETTINGS_ROUTE_ICONS] ?? Search,
			path: item.path,
			keywords: item.keywords,
		})
	);

	return [
		{ heading: routesHeading, items: routes },
		{ heading: settingsRoutesHeading, items: settingsRoutes },
		{ heading: settingsItemsHeading, items: settingsItems },
	];
}

export function CommandMenu(): React.JSX.Element {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const groups = useMemo(() => buildCommandGroups(t), [t]);

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen);
	}, []);

	const navigateTo = useCallback(
		(path: string) => {
			setOpen(false);
			navigate(path);
		},
		[navigate]
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent): void => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, []);

	return (
		<CommandDialog
			open={open}
			onOpenChange={handleOpenChange}
			label={t('command.label', 'Route search')}
			loop
		>
			<CommandInput placeholder={t('command.placeholder', 'Search routes and settings...')} />
			<CommandList>
				<CommandEmpty>
					{t('command.empty', 'No matching route or setting.')}
				</CommandEmpty>
				{groups.map((group) => (
					<CommandGroup key={group.heading} heading={group.heading}>
						{group.items.map((item) => {
							const Icon = item.icon;

							return (
								<CommandItem
									key={item.id}
									value={item.searchValue}
									keywords={item.keywords}
									onSelect={() => navigateTo(item.path)}
									className="items-start gap-2.5 px-2 py-2"
								>
									<span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
										<Icon className="size-3.5" aria-hidden="true" strokeWidth={1.8} />
									</span>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-[13px] font-medium leading-4">
											{item.label}
										</span>
										{item.description && (
											<span className="truncate text-[11px] leading-4 text-muted-foreground">
												{item.description}
											</span>
										)}
									</span>
									<CommandShortcut className="hidden max-w-36 truncate font-mono text-[10px] sm:block">
										{item.path}
									</CommandShortcut>
								</CommandItem>
							);
						})}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}
