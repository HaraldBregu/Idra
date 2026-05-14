import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppWindow, FolderOpen, Package, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppInfo } from '../../../../../shared/apps';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
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
				icon={AppWindow}
				title={t('settings.tabs.apps')}
				description={appsRoot}
				action={
					<Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
						<RefreshCw className="h-3.5 w-3.5" />
						{t('settings.apps.refresh')}
					</Button>
				}
			/>

			<SettingsSection title={t('settings.apps.title')}>
				<SettingsPanel>
					{loading ? (
						<div className="grid gap-2.5 p-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-4/5" />
						</div>
					) : apps.length === 0 ? (
						<SettingsEmptyState
							icon={Package}
							title={t('settings.apps.empty')}
							description={appsRoot}
						/>
					) : (
						apps.map((appInfo) => (
							<SettingsRow
								key={appInfo.id}
								title={
									<span className="flex min-w-0 flex-wrap items-center gap-2">
										<span className="truncate">{appInfo.manifest.name}</span>
										<SettingsValue mono className="h-5 py-0 text-[10px]">
											v{appInfo.manifest.version}
										</SettingsValue>
									</span>
								}
								description={appInfo.manifest.description}
								media={
									<div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted/60">
										{appInfo.iconDataUrl ? (
											<img
												src={appInfo.iconDataUrl}
												alt={appInfo.manifest.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<Package className="size-4 text-muted-foreground" strokeWidth={1.5} />
										)}
									</div>
								}
								contentClassName="items-center"
								actionClassName="sm:flex-nowrap"
							>
								<div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
									<Button variant="outline" size="sm" onClick={() => handleOpenFolder(appInfo.id)}>
										<FolderOpen className="size-3.5" />
										{t('settings.apps.openFolder')}
									</Button>
									<Button variant="destructive" size="sm" onClick={() => handleDelete(appInfo)}>
										<Trash2 className="size-3.5" />
										{t('settings.apps.delete')}
									</Button>
								</div>
							</SettingsRow>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AppsPage;
