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

const splitRowClassName = 'grid-cols-[minmax(0,1fr)_auto]';
const valueActionClassName = 'ml-auto w-auto max-w-[46%] justify-end';
const controlActionClassName = 'ml-auto w-auto justify-end';

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
						description={t('settings.application.nameDescription')}
						className={splitRowClassName}
						actionClassName={valueActionClassName}
						actions={<SettingsValue>{__APP_NAME__}</SettingsValue>}
					/>
					<SettingsRow
						icon={Info}
						title={t('settings.application.description')}
						description={t('settings.application.descriptionDescription')}
						className={splitRowClassName}
						actionClassName={valueActionClassName}
						actions={<SettingsValue>{__APP_DESCRIPTION__}</SettingsValue>}
					/>
					<SettingsRow
						icon={ShieldCheck}
						title={t('settings.application.version')}
						description={t('settings.application.versionDescription')}
						className={splitRowClassName}
						actionClassName={valueActionClassName}
						actions={<SettingsValue mono>{__APP_VERSION__}</SettingsValue>}
					/>
					<SettingsRow
						title={t('settings.application.author')}
						description={t('settings.application.authorDescription')}
						className={splitRowClassName}
						actionClassName={valueActionClassName}
						actions={<SettingsValue>{__APP_AUTHOR__}</SettingsValue>}
					/>
					<SettingsRow
						title={t('settings.application.license')}
						description={t('settings.application.licenseDescription')}
						className={splitRowClassName}
						actionClassName={valueActionClassName}
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
						className={splitRowClassName}
						actionClassName={controlActionClassName}
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
						className={splitRowClassName}
						actionClassName={controlActionClassName}
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
						className={splitRowClassName}
						actionClassName={controlActionClassName}
						actions={
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						}
					/>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.appData')}
						description={t('settings.application.appDataDescription')}
						className={splitRowClassName}
						actionClassName={controlActionClassName}
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
						className={splitRowClassName}
						actionClassName={controlActionClassName}
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
