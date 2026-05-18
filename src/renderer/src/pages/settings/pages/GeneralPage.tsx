import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accessibility, FolderOpen, MonitorUp, PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../components';
import { Switch } from '@/components/ui/switch';

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		void window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		void window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAccessibility = useCallback(() => {
		// window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		// window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		void window.app.openAppDataFolder();
	}, []);

	const handleOpenUserDataFolder = useCallback(() => {
		void window.app.openUserDataFolder();
	}, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.general')} />

			<SettingsSection title={t('settings.application.information')}>
				<Card size="sm" className="gap-0 p-0!">
					<div className="flex items-center border-b border-border/60 px-3 py-1.5">
						<span className="w-32 shrink-0 text-[11px] text-muted-foreground">{t('settings.application.name')}</span>
						<span className="text-[11px] text-foreground">{__APP_NAME__}</span>
					</div>
					<div className="flex items-center border-b border-border/60 px-3 py-1.5">
						<span className="w-32 shrink-0 text-[11px] text-muted-foreground">{t('settings.application.description')}</span>
						<span className="text-[11px] text-foreground">{__APP_DESCRIPTION__}</span>
					</div>
					<div className="flex items-center px-3 py-1.5">
						<span className="w-32 shrink-0 text-[11px] text-muted-foreground">{t('settings.application.version')}</span>
						<span className="font-mono text-[11px] text-foreground">{__APP_VERSION__}</span>
					</div>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<Card size="sm" className="gap-0 p-0!">
					<Item variant="outline" size="sm" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Accessibility className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.accessibility')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility} className="h-6 px-2 text-[11px]">
								{t('settings.application.openAccessibility')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="sm" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<MonitorUp className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.screenRecording')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording} className="h-6 px-2 text-[11px]">
								{t('settings.application.openScreenRecording')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="sm" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<PanelTop className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.menuBar')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						</ItemActions>
					</Item>
					<Item variant="outline" size="sm" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.appData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder} className="h-6 px-2 text-[11px]">
								{t('settings.application.openAppData')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="sm">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.userData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder} className="h-6 px-2 text-[11px]">
								{t('settings.application.openUserData')}
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
