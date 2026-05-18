import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { SETTINGS_NAVIGATION } from './navigation';

function useSettingsCurrentPage(): { labelKey: string; path: string } | null {
	const location = useLocation();
	const current = SETTINGS_NAVIGATION.find((item) => location.pathname === item.path);
	if (current) return { labelKey: current.labelKey, path: current.path };
	if (location.pathname === '/settings') {
		return { labelKey: 'settings.breadcrumb.overview', path: '/settings' };
	}
	return null;
}

function SettingsBreadcrumbHeader(): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const current = useSettingsCurrentPage();
	const isOverview = current?.path === '/settings';

	return (
		<header className="mx-auto mb-3 flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
				{current && (
					<>
						<ChevronRight className="size-3 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
						<span className="min-w-0 truncate font-medium text-foreground">
							{t(current.labelKey)}
						</span>
					</>
				)}
			</nav>
			{!isOverview && (
				<Button
					type="button"
					variant="outline"
					size="xs"
					onClick={() => navigate('/settings')}
				>
					{t('settings.overview.backToSettings')}
				</Button>
			)}
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
