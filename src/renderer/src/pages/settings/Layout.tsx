import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SETTINGS_ITEMS = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general', icon: Info },
	{ path: '/settings/system', labelKey: 'settings.tabs.system', icon: SlidersHorizontal },
	{ path: '/settings/channels', labelKey: 'settings.tabs.channels', icon: RadioTower },
	{ path: '/settings/skills', labelKey: 'settings.tabs.skills', icon: Sparkles },
	{ path: '/settings/connectors', labelKey: 'settings.tabs.connectors', icon: Plug },
	{ path: '/settings/providers', labelKey: 'settings.tabs.providers', icon: Server },
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
	const activeItemRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		activeItemRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [pathname]);

	return (
		<PageContainer>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="app-translucent-surface shrink-0 border-b border-border/60 bg-background/70 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-8">
					<nav
						className="flex min-w-0 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						aria-label={t('settings.title')}
					>
						{SETTINGS_ITEMS.map((item) => {
							const isActive =
								pathname === item.path ||
								(pathname === '/settings' && item.path === '/settings/general');
							const Icon = item.icon;

							return (
								<Button
									key={item.path}
									type="button"
									variant="ghost"
									size="sm"
									className={cn(
										'h-8 shrink-0 rounded-lg border border-transparent px-2 text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground',
										isActive &&
											'border-border/70 bg-background text-foreground shadow-sm hover:bg-background'
									)}
									onClick={() => navigate(item.path)}
									aria-current={isActive ? 'page' : undefined}
									ref={isActive ? activeItemRef : undefined}
								>
									<span
										className={cn(
											'flex size-[18px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
											isActive && 'bg-emerald-600 text-white'
										)}
									>
										<Icon className="size-3" strokeWidth={2.2} />
									</span>
									<span className="min-w-0 truncate">{t(item.labelKey)}</span>
								</Button>
							);
						})}
					</nav>
				</div>
				<main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-6 lg:px-8">
					<Outlet />
				</main>
			</div>
		</PageContainer>
	);
}
