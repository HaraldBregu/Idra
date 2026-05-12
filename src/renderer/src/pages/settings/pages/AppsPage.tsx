import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AppInfo } from '../../../../../shared/apps';

const AppsPage: React.FC = () => {
	const { t } = useTranslation();
	const [apps, setApps] = useState<AppInfo[]>([]);
	const [appsRoot, setAppsRoot] = useState<string>('');
	const [loading, setLoading] = useState(true);

	const loadApps = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			const [list, root] = await Promise.all([
				window.app.listApps(),
				window.app.getAppsRoot(),
			]);
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

	const rowClass =
		'flex min-h-[64px] w-full flex-wrap items-center gap-3 border-b border-border/70 px-6 py-2 text-sm last:border-b-0';
	const contentClass = 'flex min-w-0 flex-1 flex-col gap-1';
	const titleClass = 'flex items-center gap-2 text-sm leading-snug font-semibold';
	const descriptionClass = 'text-xs leading-normal text-muted-foreground';
	const actionsClass = 'ml-auto flex items-center justify-end gap-2';
	const versionBadgeClass =
		'rounded-md bg-muted/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground';

	return (
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<div className="mb-3 flex items-center justify-between px-2">
					<h2 className="text-sm font-semibold text-muted-foreground">
						{t('settings.apps.title')}
					</h2>
					<Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
						<RefreshCw className="h-3.5 w-3.5" />
						{t('settings.apps.refresh')}
					</Button>
				</div>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
						{apps.length === 0 ? (
							<div className={rowClass}>
								<div className={contentClass}>
									<h3 className={titleClass}>{t('settings.apps.empty')}</h3>
									<p className={descriptionClass}>{appsRoot}</p>
								</div>
							</div>
						) : (
							apps.map((appInfo) => (
								<div key={appInfo.id} className={rowClass}>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/60">
										{appInfo.iconDataUrl ? (
											<img
												src={appInfo.iconDataUrl}
												alt={appInfo.manifest.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<Package
												className="h-4 w-4 text-muted-foreground"
												strokeWidth={1.5}
											/>
										)}
									</div>
									<div className={contentClass}>
										<h3 className={titleClass}>
											{appInfo.manifest.name}
											<span className={versionBadgeClass}>v{appInfo.manifest.version}</span>
										</h3>
										{appInfo.manifest.description && (
											<p className={descriptionClass}>{appInfo.manifest.description}</p>
										)}
									</div>
									<div className={actionsClass}>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleOpenFolder(appInfo.id)}
										>
											{t('settings.apps.openFolder')}
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleDelete(appInfo)}
										>
											{t('settings.apps.delete')}
										</Button>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default AppsPage;
