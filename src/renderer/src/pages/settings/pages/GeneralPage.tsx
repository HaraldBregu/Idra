import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	AppWindow,
	FolderOpen,
	Info,
	MonitorUp,
	PanelTop,
	ShieldCheck,
	type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

function Row({
	icon: Icon,
	title,
	description,
	children,
}: {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly children?: ReactNode;
}): React.JSX.Element {
	return (
		<div className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
			<div className="flex min-w-0 items-start gap-2">
				{Icon && (
					<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
						<Icon className="size-3.5" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-tight text-foreground">{title}</div>
					{description && (
						<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">{children}</div>
			)}
		</div>
	);
}

function ValueBadge({
	children,
	mono,
}: {
	readonly children: ReactNode;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<Badge
			variant="outline"
			className={`h-auto max-w-sm truncate rounded-md bg-muted/40 py-0.5 text-[11px] text-muted-foreground ${mono ? 'font-mono' : ''}`}
		>
			{children}
		</Badge>
	);
}

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		// window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		// window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAccessibility = useCallback(() => {
		// window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		// window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		// window.app.openAppDataFolder();
	}, []);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.general')}
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						{__APP_DESCRIPTION__}
					</p>
				</div>
			</header>

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.application.information')}
				</h2>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						<Row icon={AppWindow} title={t('settings.application.name')}>
							<ValueBadge>{__APP_NAME__}</ValueBadge>
						</Row>
						<Row icon={Info} title={t('settings.application.description')}>
							<ValueBadge>{__APP_DESCRIPTION__}</ValueBadge>
						</Row>
						<Row icon={ShieldCheck} title={t('settings.application.version')}>
							<ValueBadge mono>{__APP_VERSION__}</ValueBadge>
						</Row>
						<Row title={t('settings.application.author')}>
							<ValueBadge>{__APP_AUTHOR__}</ValueBadge>
						</Row>
						<Row title={t('settings.application.license')}>
							<ValueBadge>{__APP_LICENSE__}</ValueBadge>
						</Row>
					</CardContent>
				</Card>
			</section>

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.application.actions')}
				</h2>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						<Row
							icon={Accessibility}
							title={t('settings.application.accessibility')}
							description={t('settings.application.accessibilityDescription')}
						>
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								<Accessibility className="size-3" />
								{t('settings.application.openAccessibility')}
							</Button>
						</Row>
						<Row
							icon={MonitorUp}
							title={t('settings.application.screenRecording')}
							description={t('settings.application.screenRecordingDescription')}
						>
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording}>
								<MonitorUp className="size-3" />
								{t('settings.application.openScreenRecording')}
							</Button>
						</Row>
						<Row
							icon={PanelTop}
							title={t('settings.application.menuBar')}
							description={t('settings.application.menuBarDescription')}
						>
							<Switch
								checked={trayEnabled}
								onCheckedChange={handleTrayToggle}
								aria-label={t('settings.application.menuBar')}
							/>
						</Row>
						<Row
							icon={FolderOpen}
							title={t('settings.application.appData')}
							description={t('settings.application.appDataDescription')}
						>
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder}>
								<FolderOpen className="size-3" />
								{t('settings.application.openAppData')}
							</Button>
						</Row>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default GeneralPage;
