import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Package, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AppInfo } from '../../../../../shared/apps';

function Row({
	icon: Icon,
	title,
	description,
	media,
	children,
	contentClassName,
	actionClassName,
}: {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly media?: ReactNode;
	readonly children?: ReactNode;
	readonly contentClassName?: string;
	readonly actionClassName?: string;
}): React.JSX.Element {
	return (
		<div className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
			<div className={cn('flex min-w-0 items-start gap-2', contentClassName)}>
				{media ??
					(Icon && (
						<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
							<Icon className="size-3.5" />
						</div>
					))}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-tight text-foreground">{title}</div>
					{description && (
						<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div className={cn('flex min-w-0 flex-wrap items-center justify-end gap-1.5', actionClassName)}>
					{children}
				</div>
			)}
		</div>
	);
}

const AppsPage: React.FC = () => {
	const { t } = useTranslation();
	const [apps, setApps] = useState<AppInfo[]>([]);
	const [appsRoot, setAppsRoot] = useState<string>('');
	const [loading, setLoading] = useState(true);

	const loadApps = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			const [list, root] = await Promise.all([window.app.listApps(), window.app.getAppsRoot()]);
			setApps(list);
			setAppsRoot(root);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadApps();
	}, [loadApps]);

	const handleOpenFolder = useCallback((id: string) => {
		void window.app.openAppFolder(id);
	}, []);

	const handleDelete = useCallback(
		(appInfo: AppInfo) => {
			const message = t('settings.apps.confirmDelete', { name: appInfo.manifest.name });
			if (!window.confirm(message)) return;
			void window.app.deleteApp(appInfo.id).then(loadApps).catch(loadApps);
		},
		[loadApps, t]
	);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.apps')}
					</h1>
					{appsRoot && (
						<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">{appsRoot}</p>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button variant="outline" size="xs" onClick={loadApps} disabled={loading}>
						<RefreshCw className="size-3" />
						{t('settings.apps.refresh')}
					</Button>
				</div>
			</header>

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.apps.title')}
				</h2>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						{loading ? (
							<div className="grid gap-2 p-2.5">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-4/5" />
							</div>
						) : apps.length === 0 ? (
							<Empty className="min-h-28 gap-3 border-0 p-4">
								<EmptyHeader className="gap-1.5">
									<EmptyMedia variant="icon" className="mb-1 size-7">
										<Package className="size-3.5" />
									</EmptyMedia>
									<EmptyTitle className="text-[13px]">{t('settings.apps.empty')}</EmptyTitle>
									{appsRoot && (
										<EmptyDescription className="text-xs leading-snug">{appsRoot}</EmptyDescription>
									)}
								</EmptyHeader>
							</Empty>
						) : (
							apps.map((appInfo) => (
								<Row
									key={appInfo.id}
									title={
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{appInfo.manifest.name}</span>
											<Badge
												variant="outline"
												className="h-4 rounded-md bg-muted/40 py-0 font-mono text-[10px] text-muted-foreground"
											>
												v{appInfo.manifest.version}
											</Badge>
										</span>
									}
									description={appInfo.manifest.description}
									media={
										<div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted/60">
											{appInfo.iconDataUrl ? (
												<img
													src={appInfo.iconDataUrl}
													alt={appInfo.manifest.name}
													className="h-full w-full object-cover"
												/>
											) : (
												<Package className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
											)}
										</div>
									}
									contentClassName="items-center"
									actionClassName="flex-nowrap"
								>
									<div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
										<Button
											variant="outline"
											size="xs"
											onClick={() => handleOpenFolder(appInfo.id)}
										>
											<FolderOpen className="size-3" />
											{t('settings.apps.openFolder')}
										</Button>
										<Button
											variant="destructive"
											size="xs"
											onClick={() => handleDelete(appInfo)}
										>
											<Trash2 className="size-3" />
											{t('settings.apps.delete')}
										</Button>
									</div>
								</Row>
							))
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default AppsPage;
