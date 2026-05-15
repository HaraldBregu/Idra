import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageSidebar, PageSidebarInset } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SETTINGS_ITEMS = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general' },
	{ path: '/settings/channels', labelKey: 'settings.tabs.channels' },
	{ path: '/settings/connectors', labelKey: 'settings.tabs.connectors' },
	{ path: '/settings/skills', labelKey: 'settings.tabs.skills' },
	{ path: '/settings/providers', labelKey: 'settings.tabs.providers' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
	{ path: '/settings/cron', labelKey: 'settings.tabs.cron' },
	{ path: '/settings/apps', labelKey: 'settings.tabs.apps' },
] satisfies readonly {
	readonly path: string;
	readonly labelKey: string;
}[];

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const [query, setQuery] = useState('');
	const normalizedQuery = query.trim().toLowerCase();
	const items = useMemo(
		() =>
			SETTINGS_ITEMS.map((item) => ({ ...item, label: t(item.labelKey) })).filter((item) =>
				normalizedQuery ? item.label.toLowerCase().includes(normalizedQuery) : true
			),
		[normalizedQuery, t]
	);

	return (
		<PageContainer>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<PageSidebar className="w-40 border-r border-border/70 px-2.5 py-3 sm:w-48 lg:w-56">
					<div className="mb-3">
						<Input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t('settings.search')}
							aria-label={t('settings.searchLabel')}
							className="h-8 rounded-lg bg-background/80 px-2.5 text-sm"
						/>
					</div>
					<nav className="flex flex-col gap-1" aria-label={t('settings.title')}>
						{items.map((item) => {
							const isActive =
								pathname === item.path ||
								(pathname === '/settings' && item.path === '/settings/general');

							return (
								<Button
									key={item.path}
									type="button"
									variant="ghost"
									size="sm"
									className={cn(
										'h-9 w-full justify-start rounded-lg px-3 text-left text-sm',
										isActive &&
											'bg-secondary text-secondary-foreground shadow-none hover:bg-secondary'
									)}
									onClick={() => navigate(item.path)}
									aria-current={isActive ? 'page' : undefined}
								>
									<span className="min-w-0 truncate">{item.label}</span>
								</Button>
							);
						})}
					</nav>
				</PageSidebar>
				<PageSidebarInset className="px-4 pb-4 pt-4 sm:px-6 lg:px-8">
					<Outlet />
				</PageSidebarInset>
			</div>
		</PageContainer>
	);
}
