import React, { useState, useEffect, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../components';

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
		<SettingsPageShell>
			<SettingsPageHeader
				icon={Info}
				title={t('settings.tabs.general')}
				description={__APP_DESCRIPTION__}
			/>

			<SettingsSection title={t('settings.application.information')}>
				<SettingsPanel>
					<SettingsRow icon={AppWindow} title={t('settings.application.name')}>
						<SettingsValue>{__APP_NAME__}</SettingsValue>
					</SettingsRow>
					<SettingsRow icon={Info} title={t('settings.application.description')}>
						<SettingsValue className="max-w-sm">{__APP_DESCRIPTION__}</SettingsValue>
					</SettingsRow>
					<SettingsRow icon={ShieldCheck} title={t('settings.application.version')}>
						<SettingsValue mono>{__APP_VERSION__}</SettingsValue>
					</SettingsRow>
					<SettingsRow title={t('settings.application.author')}>
						<SettingsValue className="max-w-sm">{__APP_AUTHOR__}</SettingsValue>
					</SettingsRow>
					<SettingsRow title={t('settings.application.license')}>
						<SettingsValue>{__APP_LICENSE__}</SettingsValue>
					</SettingsRow>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<SettingsPanel>
					<SettingsRow
						icon={Accessibility}
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
					>
						<Button variant="outline" size="sm" onClick={handleOpenAccessibility}>
							<Accessibility className="size-3.5" />
							{t('settings.application.openAccessibility')}
						</Button>
					</SettingsRow>
					<SettingsRow
						icon={MonitorUp}
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
					>
						<Button variant="outline" size="sm" onClick={handleOpenScreenRecording}>
							<MonitorUp className="size-3.5" />
							{t('settings.application.openScreenRecording')}
						</Button>
					</SettingsRow>
					<SettingsRow
						icon={PanelTop}
						title={t('settings.application.menuBar')}
						description={t('settings.application.menuBarDescription')}
					>
						<Switch
							checked={trayEnabled}
							onCheckedChange={handleTrayToggle}
							aria-label={t('settings.application.menuBar')}
						/>
					</SettingsRow>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.appData')}
						description={t('settings.application.appDataDescription')}
					>
						<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
							<FolderOpen className="size-3.5" />
							{t('settings.application.openAppData')}
						</Button>
					</SettingsRow>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
