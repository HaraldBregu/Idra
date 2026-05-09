import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
	PageSidebar,
	PageSidebarInset,
} from '@/components/app/base/page';
import { useApp } from '@/contexts';
import { Button } from '@/components/ui/Button';

type SettingsPath =
	| '/settings/general'
	| '/settings/account'
	| '/settings/editor'
	| '/settings/themes'
	| '/settings/agents'
	| '/settings/providers'
	| '/settings/channels'
	| '/settings/assistant'
	| '/settings/system'
	| '/settings/developer';

interface NavItemProps {
	readonly to: SettingsPath;
	readonly label: string;
	readonly badge?: React.ReactNode;
}

function NavItem({ to, label, badge }: NavItemProps): React.JSX.Element {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link to={to} className="block outline-none">
			<Button
				nativeButton={false}
				variant={isActive ? 'secondary' : 'ghost'}
				size="md"
				className="w-full justify-start"
				render={<span />}
			>
				<span className="flex-1 text-left">{label}</span>
				{badge !== undefined && badge !== null && (
					<span className="ml-auto text-xs text-muted-foreground tabular-nums">
						{badge}
					</span>
				)}
			</Button>
		</Link>
	);
}

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	useApp();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t('settings.title')}</PageHeaderTitle>
			</PageHeader>
			<PageBody className="flex-row overflow-hidden p-0">
				<PageSidebar className="w-52 border-r-0">
					<div className="flex flex-col gap-0.5">
						<NavItem to="/settings/general" label={t('settings.tabs.general')} />
						<NavItem to="/settings/account" label={t('settings.tabs.account')} />
						<NavItem to="/settings/editor" label={t('settings.tabs.editor')} />
						<NavItem to="/settings/themes" label={t('settings.tabs.themes')} />
						<NavItem to="/settings/agents" label={t('settings.tabs.agents', 'Agents')} badge={3} />
						<NavItem to="/settings/providers" label={t('settings.tabs.providers', 'Providers')} badge={2} />
						<NavItem to="/settings/channels" label={t('settings.tabs.channels', 'Channels')} badge={1} />
						<NavItem to="/settings/assistant" label={t('settings.tabs.assistant', 'Assistant')} />
						<NavItem to="/settings/system" label={t('settings.tabs.system')} />
						<NavItem to="/settings/developer" label={t('settings.tabs.developer')} />
					</div>
				</PageSidebar>
				<PageSidebarInset>
					<Outlet />
				</PageSidebarInset>
			</PageBody>
		</PageContainer>
	);
}
