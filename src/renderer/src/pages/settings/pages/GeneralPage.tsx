import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection } from '../components';
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
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="w-32 px-3 py-1.5 text-[11px] text-muted-foreground">{t('settings.application.name')}</TableCell>
								<TableCell className="px-3 py-1.5 text-[11px] text-foreground">{__APP_NAME__}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="w-32 px-3 py-1.5 text-[11px] text-muted-foreground">{t('settings.application.description')}</TableCell>
								<TableCell className="px-3 py-1.5 text-[11px] text-foreground">{__APP_DESCRIPTION__}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="w-32 px-3 py-1.5 text-[11px] text-muted-foreground">{t('settings.application.version')}</TableCell>
								<TableCell className="px-3 py-1.5 font-mono text-[11px] text-foreground">{__APP_VERSION__}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<SettingsPanel>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="px-3 py-2">
									<div className="text-[13px] font-medium text-foreground">{t('settings.application.accessibility')}</div>
									<div className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.application.accessibilityDescription')}</div>
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Button variant="outline" size="xs" onClick={handleOpenAccessibility} className="h-6 px-2 text-[11px]">
										{t('settings.application.openAccessibility')}
									</Button>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="px-3 py-2">
									<div className="text-[13px] font-medium text-foreground">{t('settings.application.screenRecording')}</div>
									<div className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.application.screenRecordingDescription')}</div>
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Button variant="outline" size="xs" onClick={handleOpenScreenRecording} className="h-6 px-2 text-[11px]">
										{t('settings.application.openScreenRecording')}
									</Button>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="px-3 py-2">
									<div className="text-[13px] font-medium text-foreground">{t('settings.application.menuBar')}</div>
									<div className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.application.menuBarDescription')}</div>
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Switch size="sm" checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="px-3 py-2">
									<div className="text-[13px] font-medium text-foreground">{t('settings.application.appData')}</div>
									<div className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.application.appDataDescription')}</div>
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder} className="h-6 px-2 text-[11px]">
										{t('settings.application.openAppData')}
									</Button>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="px-3 py-2">
									<div className="text-[13px] font-medium text-foreground">{t('settings.application.userData')}</div>
									<div className="mt-0.5 text-[11px] text-muted-foreground">{t('settings.application.userDataDescription')}</div>
								</TableCell>
								<TableCell className="px-3 py-2 text-right">
									<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder} className="h-6 px-2 text-[11px]">
										{t('settings.application.openUserData')}
									</Button>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
