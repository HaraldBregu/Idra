import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	FolderOpen,
	MonitorUp,
	PanelTop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsRow, SettingsSection } from '../components';
import { Switch } from '@/components/ui/switch';

const generalRowClassName =
	'grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-3.5 py-2.5 sm:px-4 sm:py-2.5';
const generalContentClassName = 'items-start gap-2.5';
const valueActionClassName = 'ml-auto w-auto max-w-[44%] justify-end text-right';
const controlActionClassName = 'ml-auto w-auto shrink-0 justify-end';
const actionButtonClassName = 'h-6 gap-1.5 px-2 text-[11px]';

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
								<TableCell className="w-28 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{t('settings.application.name')}</TableCell>
								<TableCell className="px-3 py-1.5 text-[11px] text-foreground">{__APP_NAME__}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="w-28 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{t('settings.application.description')}</TableCell>
								<TableCell className="px-3 py-1.5 text-[11px] text-foreground">{__APP_DESCRIPTION__}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="w-28 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{t('settings.application.version')}</TableCell>
								<TableCell className="px-3 py-1.5 font-mono text-[11px] text-foreground">{__APP_VERSION__}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<SettingsPanel>
					<SettingsRow
						icon={Accessibility}
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						className={generalRowClassName}
						contentClassName={generalContentClassName}
						actionClassName={controlActionClassName}
						actions={
							<Button
								variant="outline"
								size="xs"
								onClick={handleOpenAccessibility}
								className={actionButtonClassName}
							>
								<Accessibility className="size-3" />
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SettingsRow
						icon={MonitorUp}
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						className={generalRowClassName}
						contentClassName={generalContentClassName}
						actionClassName={controlActionClassName}
						actions={
							<Button
								variant="outline"
								size="xs"
								onClick={handleOpenScreenRecording}
								className={actionButtonClassName}
							>
								<MonitorUp className="size-3" />
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
					<SettingsRow
						icon={PanelTop}
						title={t('settings.application.menuBar')}
						description={t('settings.application.menuBarDescription')}
						className={generalRowClassName}
						contentClassName={generalContentClassName}
						actionClassName={controlActionClassName}
						actions={
							<Switch size="sm" checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						}
					/>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.appData')}
						description={t('settings.application.appDataDescription')}
						className={generalRowClassName}
						contentClassName={generalContentClassName}
						actionClassName={controlActionClassName}
						actions={
							<Button
								variant="outline"
								size="xs"
								onClick={handleOpenAppDataFolder}
								className={actionButtonClassName}
							>
								<FolderOpen className="size-3" />
								{t('settings.application.openAppData')}
							</Button>
						}
					/>
					<SettingsRow
						icon={FolderOpen}
						title={t('settings.application.userData')}
						description={t('settings.application.userDataDescription')}
						className={generalRowClassName}
						contentClassName={generalContentClassName}
						actionClassName={controlActionClassName}
						actions={
							<Button
								variant="outline"
								size="xs"
								onClick={handleOpenUserDataFolder}
								className={actionButtonClassName}
							>
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
