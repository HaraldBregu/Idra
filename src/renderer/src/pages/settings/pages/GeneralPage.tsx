import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	AppWindow,
	FolderOpen,
	Info,
	MonitorUp,
	PanelTop,
	ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsRow, SettingsSection, SettingsValue } from '../components';
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
			<SettingsPageHeader title={t('settings.tabs.general')} description={__APP_DESCRIPTION__} />

			<SettingsSection title={t('settings.application.information')}>
				<SettingsPanel>
					<SettingsRow
						icon={AppWindow}
						title={t('settings.application.name')}
						actions={<SettingsValue>{__APP_NAME__}</SettingsValue>}
					/>
					<SettingsRow
						icon={Info}
						title={t('settings.application.description')}
						actions={<SettingsValue>{__APP_DESCRIPTION__}</SettingsValue>}
					/>
					<SettingsRow
						icon={ShieldCheck}
						title={t('settings.application.version')}
						actions={<SettingsValue mono>{__APP_VERSION__}</SettingsValue>}
					/>
					<SettingsRow
						title={t('settings.application.author')}
						actions={<SettingsValue>{__APP_AUTHOR__}</SettingsValue>}
					/>
					<SettingsRow
						title={t('settings.application.license')}
						actions={<SettingsValue>{__APP_LICENSE__}</SettingsValue>}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<SettingsPanel>
					<SettingsRow
						icon={Accessibility}
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								<Accessibility className="size-3" />
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SettingsRow
						icon={MonitorUp}
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording}>
								<MonitorUp className="size-3" />
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
					<SettingsRow
						icon={PanelTop}
						title={t('settings.application.menuBar')}
						description={t('settings.application.menuBarDescription')}
						actions={
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						}
					/>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.appData')}
						description={t('settings.application.appDataDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder}>
								<FolderOpen className="size-3" />
								{t('settings.application.openAppData')}
							</Button>
						}
					/>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.userData')}
						description={t('settings.application.userDataDescription')}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder}>
								<FolderOpen className="size-3" />
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
