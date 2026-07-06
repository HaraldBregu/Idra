import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	MonitorUp,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { MediaPermissionsSection } from '../../components/media';
import type { SystemPreferencePaneId } from '../../../../../../shared/app_types';

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function SystemSettingsItem({
	title,
	description,
	icon,
	actions,
	actionClassName,
}: {
	readonly title: React.ReactNode;
	readonly description?: React.ReactNode;
	readonly icon: LucideIcon;
	readonly actions?: React.ReactNode;
	readonly actionClassName?: string;
}): React.JSX.Element {
	return (
		<Item variant="outline" size="md" className="min-h-11 border-b border-border/60 last:border-b-0">
			<ItemIcon icon={icon} className="[&_svg]:size-4" />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0.5">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{title}
				</ItemTitle>
				{description && (
					<p className="max-w-full text-[11px] leading-4 text-muted-foreground">
						{description}
					</p>
				)}
			</ItemContent>
			{actions && (
				<ItemActions
					className={cn(
						'ml-auto flex-none flex-wrap justify-end gap-1.5',
						actionClassName
					)}
				>
					{actions}
				</ItemActions>
			)}
		</Item>
	);
}

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const [systemPreferenceError, setSystemPreferenceError] = useState('');

	const handleOpenSystemPreference = useCallback((pane: SystemPreferencePaneId) => {
		setSystemPreferenceError('');
		void window.app.openSystemPreference(pane)
			.catch((error: unknown) => {
				setSystemPreferenceError(errorMessage(error, t('settings.system.errors.openPreference')));
			});
	}, [t]);

	const handleOpenAccessibility = useCallback(() => {
		handleOpenSystemPreference('Accessibility');
	}, [handleOpenSystemPreference]);

	const handleOpenScreenRecording = useCallback(() => {
		handleOpenSystemPreference('ScreenCapture');
	}, [handleOpenSystemPreference]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.system')}
				description={t('settings.system.description')}
			/>

			{systemPreferenceError && (
				<SettingsNotice variant="destructive">{systemPreferenceError}</SettingsNotice>
			)}
			<MediaPermissionsSection />

			<SettingsSection
				title={t('settings.application.actions')}
				className="mt-4"
			>
				<SettingsPanel>
					<SystemSettingsItem
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						icon={Accessibility}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SystemSettingsItem
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						icon={MonitorUp}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording}>
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SystemPage;
