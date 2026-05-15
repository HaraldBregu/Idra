import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	AppWindow,
	BotMessageSquare,
	CalendarClock,
	Info,
	Plug,
	Server,
	SlidersHorizontal,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import { PageContainer, PageSidebar, PageSidebarInset } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';

const SETTINGS_ITEMS = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general', icon: Info },
	{ path: '/settings/channels', labelKey: 'settings.tabs.channels', icon: BotMessageSquare },
	{ path: '/settings/connectors', labelKey: 'settings.tabs.connectors', icon: Plug },
	{ path: '/settings/skills', labelKey: 'settings.tabs.skills', icon: Sparkles },
	{ path: '/settings/providers', labelKey: 'settings.tabs.providers', icon: Server },
	{ path: '/settings/system', labelKey: 'settings.tabs.system', icon: SlidersHorizontal },
	{ path: '/settings/cron', labelKey: 'settings.tabs.cron', icon: CalendarClock },
	{ path: '/settings/apps', labelKey: 'settings.tabs.apps', icon: AppWindow },
] satisfies readonly {
	readonly path: string;
	readonly labelKey: string;
	readonly icon: LucideIcon;
}[];

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;

	return (
		<PageContainer>
			<div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
				<PageSidebar className="w-14 border-none px-2 sm:w-44">
					<nav className="flex flex-col gap-1">
						{SETTINGS_ITEMS.map((item) => {
							const isActive =
								pathname === item.path ||
								(pathname === '/settings' && item.path === '/settings/general');
							const Icon = item.icon;
							const label = t(item.labelKey);

							return (
								// CSS tooltip via data attribute — visible only on mobile (icon-only mode, <sm)
								<div key={item.path} className="settings-nav-item sm:contents" data-label={label}>
									<Button
										type="button"
										variant={isActive ? 'secondary' : 'ghost'}
										size="sm"
										className="w-full justify-center px-0 sm:justify-start sm:px-2.5"
										onClick={() => navigate(item.path)}
										aria-current={isActive ? 'page' : undefined}
										aria-label={label}
									>
										<Icon className="size-3.5" aria-hidden />
										<span className="hidden min-w-0 truncate sm:inline" aria-hidden>
											{label}
										</span>
									</Button>
								</div>
							);
						})}
					</nav>
				</PageSidebar>
				<PageSidebarInset className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
					<Outlet />
				</PageSidebarInset>
			</div>
		</PageContainer>
	);
}
