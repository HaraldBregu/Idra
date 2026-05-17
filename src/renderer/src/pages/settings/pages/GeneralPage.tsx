import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsRow, SettingsSection } from '../components';
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
				<SettingsPanel>
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
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<SettingsPanel>
					<SettingsRow
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility} className="h-6 px-2 text-[11px]">
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SettingsRow
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording} className="h-6 px-2 text-[11px]">
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
					<SettingsRow
						title={t('settings.application.menuBar')}
						description={t('settings.application.menuBarDescription')}
						actions={
							<Switch size="sm" checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						}
					/>
					<SettingsRow
						title={t('settings.application.appData')}
						description={t('settings.application.appDataDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder} className="h-6 px-2 text-[11px]">
								{t('settings.application.openAppData')}
							</Button>
						}
					/>
					<SettingsRow
						title={t('settings.application.userData')}
						description={t('settings.application.userDataDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder} className="h-6 px-2 text-[11px]">
								{t('settings.application.openUserData')}
							</Button>
						}
					/>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
