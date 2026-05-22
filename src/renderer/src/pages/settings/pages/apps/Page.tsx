import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Package, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AppInfo } from '../../../../../../shared/app-info';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

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
					<Button variant="outline" size="xs" onClick={loadApps} disabled={loading}>
						<RefreshCw className="size-3" />
						{t('settings.apps.refresh')}
					</Button>
				}
			/>

			<SettingsSection title={t('settings.apps.title')}>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : apps.length === 0 ? (
						<SettingsEmptyState
							icon={Package}
							title={t('settings.apps.empty')}
							description={appsRoot || t('settings.apps.description')}
						/>
					) : (
						apps.map((appInfo) => (
							<Item key={appInfo.id} variant="outline" size="sm" className="border-b border-border/60 last:border-b-0">
								<ItemMedia variant="icon" className="overflow-hidden border border-border/70">
									{appInfo.iconDataUrl ? (
										<img
											src={appInfo.iconDataUrl}
											alt={appInfo.manifest.name}
											className="h-full w-full object-cover"
										/>
									) : (
										<Package className="size-3" strokeWidth={1.8} />
									)}
								</ItemMedia>
								<ItemContent>
									<ItemTitle>
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{appInfo.manifest.name}</span>
											<Badge
												variant="outline"
												className="h-4 rounded-md bg-muted/40 px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
											>
												v{appInfo.manifest.version}
											</Badge>
										</span>
									</ItemTitle>
								</ItemContent>
								<ItemActions className="flex-wrap gap-1.5 sm:flex-nowrap">
									<Button variant="outline" size="xs" onClick={() => handleOpenFolder(appInfo.id)}>
										<FolderOpen className="size-3" />
										{t('settings.apps.openFolder')}
									</Button>
									<Button variant="destructive" size="xs" onClick={() => handleDelete(appInfo)}>
										<Trash2 className="size-3" />
										{t('settings.apps.delete')}
									</Button>
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AppsPage;
