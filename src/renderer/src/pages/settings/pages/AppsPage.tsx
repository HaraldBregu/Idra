import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Package, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppInfo } from '../../../../../shared/apps';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
	SettingsRow,
} from '../components';

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
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.apps')}
				description={appsRoot || t('settings.apps.description')}
				action={
					<Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
						<RefreshCw className="size-3" />
						{t('settings.apps.refresh')}
					</Button>
				}
			/>

			<SettingsSection
				title={t('settings.apps.title')}
				description={appsRoot}
			>
				<SettingsPanel>
					{loading ? (
						<div className="grid gap-2 p-2.5">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-4/5" />
						</div>
					) : apps.length === 0 ? (
						<Empty className="min-h-28 gap-3 border-0 p-4">
							<EmptyHeader className="gap-1.5">
								<EmptyMedia variant="icon" className="mb-1 size-10">
									<Package className="size-5" />
								</EmptyMedia>
								<EmptyTitle className="text-sm">{t('settings.apps.empty')}</EmptyTitle>
								{appsRoot && (
									<EmptyDescription className="text-sm leading-5">{appsRoot}</EmptyDescription>
								)}
							</EmptyHeader>
						</Empty>
					) : (
						apps.map((appInfo) => (
							<SettingsRow
								key={appInfo.id}
								icon={Package}
								title={
									<span className="flex min-w-0 flex-wrap items-center gap-1.5">
										<span className="truncate">{appInfo.manifest.name}</span>
										<Badge
											variant="outline"
											className="h-5 rounded-lg bg-muted/40 py-0 font-mono text-xs text-muted-foreground"
										>
											v{appInfo.manifest.version}
										</Badge>
									</span>
								}
								description={appInfo.manifest.description}
								contentClassName="items-center"
								media={
									<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/60">
										{appInfo.iconDataUrl ? (
											<img
												src={appInfo.iconDataUrl}
												alt={appInfo.manifest.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<Package className="size-5 text-muted-foreground" strokeWidth={1.8} />
										)}
									</div>
								}
								actions={
									<div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
										<Button variant="outline" size="sm" onClick={() => handleOpenFolder(appInfo.id)}>
											<FolderOpen className="size-3" />
											{t('settings.apps.openFolder')}
										</Button>
										<Button variant="destructive" size="sm" onClick={() => handleDelete(appInfo)}>
											<Trash2 className="size-3" />
											{t('settings.apps.delete')}
										</Button>
									</div>
								}
							/>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AppsPage;
