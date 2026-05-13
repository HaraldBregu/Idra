import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageContainer,
	PageSidebar,
	PageSidebarInset,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts';

const SETTINGS_ITEMS = [
	{ path: '/settings/general', labelKey: 'settings.tabs.general' },
	{ path: '/settings/account', labelKey: 'settings.tabs.account' },
	{ path: '/settings/channels', labelKey: 'settings.tabs.channels' },
	{ path: '/settings/connectors', labelKey: 'settings.tabs.connectors' },
	{ path: '/settings/providers', labelKey: 'settings.tabs.providers' },
	{ path: '/settings/system', labelKey: 'settings.tabs.system' },
	{ path: '/settings/cron', labelKey: 'settings.tabs.cron' },
	{ path: '/settings/apps', labelKey: 'settings.tabs.apps' },
] as const;

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	useApp();
	const pathname = location.pathname;

	return (
		<PageContainer>
			<div className="flex min-h-0 gap-4 flex-1 overflow-hidden">
				<PageSidebar className="w-36 border-none">
					<div className="flex flex-col gap-1">
						{SETTINGS_ITEMS.map((item) => {
							const isActive =
								pathname === item.path ||
								(pathname === '/settings' && item.path === '/settings/general');

							return (
								<Button
									key={item.path}
									type="button"
									variant={isActive ? 'secondary' : 'ghost'}
									size="sm"
									className="w-full justify-start px-3"
									onClick={() => navigate(item.path)}
								>
									{t(item.labelKey)}
								</Button>
							);
						})}
					</div>
				</PageSidebar>
				<PageSidebarInset className="p-6">
					<Outlet />
				</PageSidebarInset>
			</div>
		</PageContainer>
	);
}
