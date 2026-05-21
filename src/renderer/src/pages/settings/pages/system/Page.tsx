import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	BatteryCharging,
	Mic,
	MonitorCog,
	MonitorUp,
	RefreshCw,
	ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import type {
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
} from '../../../../../../shared/app-permissions';

const DEFAULT_MICROPHONE_PERMISSION: MicrophonePermissionSettings = {
	enabled: true,
	systemStatus: 'unknown',
	canRequest: false,
};

function microphoneStatusKey(status: MicrophoneSystemPermissionStatus): string {
	return `settings.microphone.status.${status}`;
}

function microphoneActionKey(permission: MicrophonePermissionSettings): string {
	if (!permission.enabled) return 'settings.microphone.actions.activate';
	if (permission.systemStatus === 'granted') return 'settings.microphone.actions.check';
	return 'settings.microphone.actions.request';
}

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
	const [keepAwakeLoading, setKeepAwakeLoading] = useState(true);
	const [microphonePermission, setMicrophonePermission] =
		useState<MicrophonePermissionSettings>(DEFAULT_MICROPHONE_PERMISSION);
	const [microphoneLoading, setMicrophoneLoading] = useState(true);
	const [microphoneError, setMicrophoneError] = useState('');

	useEffect(() => {
		let mounted = true;
		void window.app.getKeepAwakeEnabled()
			.then((enabled) => {
				if (mounted) setKeepAwakeEnabled(enabled);
			})
			.catch(() => {
				if (mounted) setKeepAwakeEnabled(false);
			})
			.finally(() => {
				if (mounted) setKeepAwakeLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	const refreshMicrophonePermission = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			setMicrophonePermission(await window.app.getMicrophonePermission());
		} catch (error) {
			setMicrophoneError(
				error instanceof Error ? error.message : t('settings.microphone.errors.load')
			);
		} finally {
			setMicrophoneLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void refreshMicrophonePermission();
	}, [refreshMicrophonePermission]);

	const handleKeepAwakeToggle = useCallback((checked: boolean) => {
		setKeepAwakeEnabled(checked);
		setKeepAwakeLoading(true);
		void window.app.setKeepAwakeEnabled(checked)
			.then(setKeepAwakeEnabled)
			.catch(() => {
				setKeepAwakeEnabled(!checked);
				void window.app.getKeepAwakeEnabled()
					.then(setKeepAwakeEnabled)
					.catch(() => undefined);
			})
			.finally(() => setKeepAwakeLoading(false));
	}, []);

	const handleMicrophoneToggle = useCallback((checked: boolean) => {
		setMicrophonePermission((current) => ({ ...current, enabled: checked }));
		setMicrophoneError('');
		void window.app.setMicrophoneEnabled(checked)
			.then(setMicrophonePermission)
			.catch((error: unknown) => {
				setMicrophoneError(
					error instanceof Error ? error.message : t('settings.microphone.errors.save')
				);
				void refreshMicrophonePermission();
			});
	}, [refreshMicrophonePermission, t]);

	const handleMicrophoneAction = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			if (!microphonePermission.enabled) {
				await window.app.setMicrophoneEnabled(true);
			}
			setMicrophonePermission(await window.app.requestMicrophonePermission());
		} catch (error) {
			setMicrophoneError(
				error instanceof Error ? error.message : t('settings.microphone.errors.request')
			);
		} finally {
			setMicrophoneLoading(false);
		}
	}, [microphonePermission.enabled, t]);

	const handleOpenAccessibility = useCallback(() => undefined, []);

	const handleOpenScreenRecording = useCallback(() => undefined, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.system')}
				description={t('settings.system.description')}
				icon={MonitorCog}
			/>

			<SettingsSection
				title={t('settings.microphone.title')}
				description={t('settings.microphone.description')}
			>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Mic className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.microphone.recording')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.microphone.recordingDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={microphonePermission.enabled}
								disabled={microphoneLoading}
								onCheckedChange={handleMicrophoneToggle}
								aria-label={t('settings.microphone.recording')}
							/>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<ShieldCheck className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.microphone.systemPermission')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{microphoneError || t('settings.microphone.systemPermissionDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end gap-2">
							<span className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
								{t(microphoneStatusKey(microphonePermission.systemStatus))}
							</span>
							<Button
								variant="outline"
								size="xs"
								onClick={() => void handleMicrophoneAction()}
								disabled={microphoneLoading}
							>
								{t(microphoneActionKey(microphonePermission))}
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => void refreshMicrophonePermission()}
								disabled={microphoneLoading}
								aria-label={t('settings.microphone.actions.refresh')}
								title={t('settings.microphone.actions.refresh')}
							>
								<RefreshCw className="size-3" />
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Accessibility className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.accessibility')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								{t('settings.application.openAccessibility')}
							</Button>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
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
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<BatteryCharging className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{t('settings.application.keepAwake')}</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.application.keepAwakeDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={keepAwakeEnabled}
								disabled={keepAwakeLoading}
								onCheckedChange={handleKeepAwakeToggle}
								aria-label={t('settings.application.keepAwake')}
							/>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SystemPage;
