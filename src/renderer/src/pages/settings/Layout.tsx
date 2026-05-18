import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { useTranslation } from 'react-i18next';
import { SETTINGS_NAVIGATION } from './navigation';
import { getChannelCatalogEntry } from '../../../../shared/channel-catalog';

interface SettingsBreadcrumbItem {
	readonly label: string;
	readonly path?: string;
}

function useSettingsBreadcrumbItems(): readonly SettingsBreadcrumbItem[] {
	const { t } = useTranslation();
	const location = useLocation();
	if (location.pathname === '/settings') return [];

	const current = SETTINGS_NAVIGATION.find((item) => (
		location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
	));
	if (!current) return [];

	const items: SettingsBreadcrumbItem[] = [{ label: t(current.labelKey) }];

	if (location.pathname.startsWith('/settings/channels/channelDetail/')) {
		const channelId = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
		const channelLabel = getChannelCatalogEntry(channelId)?.label ?? channelId;
		items[0] = { ...items[0], path: current.path };
		items.push({ label: channelLabel });
	}

	return items;
}

function SettingsBreadcrumbHeader(): React.JSX.Element | null {
	const { t } = useTranslation();
	const items = useSettingsBreadcrumbItems();

	if (items.length === 0) return null;

	return (
		<header className="mx-auto mb-5 flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<nav
				aria-label={t('settings.breadcrumb.label')}
				className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"
			>
				<Settings className="size-3 shrink-0" strokeWidth={1.8} />
				<Link
					to="/settings"
					className="min-w-0 rounded-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
				>
					{t('settings.title')}
				</Link>
				{items.map((item, index) => (
					<React.Fragment key={`${item.label}-${index}`}>
						<ChevronRight className="size-3 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
						{item.path ? (
							<Link
								to={item.path}
								className="min-w-0 rounded-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
							>
								{item.label}
							</Link>
						) : (
							<span className="min-w-0 truncate font-medium text-foreground">
								{item.label}
							</span>
						)}
					</React.Fragment>
				))}
			</nav>
		</header>
	);
}

export function Layout(): React.JSX.Element {
	return (
		<PageContainer className="bg-muted/20">
			<main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
				<SettingsBreadcrumbHeader />
				<Outlet />
			</main>
			<footer className="shrink-0 border-t border-border/50 px-4 py-2 sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="text-[10px] text-muted-foreground/60">Privacy</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">Terms</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">Support</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-[10px] text-muted-foreground/60">Open Source</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">macOS</span>
					</div>
				</div>
			</footer>
		</PageContainer>
	);
}
