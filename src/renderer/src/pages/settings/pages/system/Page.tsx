import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Accessibility,
	BatteryCharging,
	Camera,
	Mic,
	MonitorCog,
	MonitorUp,
	RefreshCw,
	ShieldCheck,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../components';
import type {
	CameraPermissionSettings,
	CameraSystemPermissionStatus,
	MicrophonePermissionSettings,
	MicrophoneSystemPermissionStatus,
	SystemPreferencePaneId,
} from '../../../../../../shared/app-permissions';
import {
	SYSTEM_CAPABILITY_GROUPS,
	type SystemCapabilityAvailability,
	type SystemCapabilityGroup,
	type SystemCapabilityItem,
} from './capabilities';

type MediaPermissionKind = 'microphone' | 'camera';
type MediaPermissionSettings = MicrophonePermissionSettings | CameraPermissionSettings;
type MediaPermissionStatus = MicrophoneSystemPermissionStatus | CameraSystemPermissionStatus;

const DEFAULT_MICROPHONE_PERMISSION: MicrophonePermissionSettings = {
	enabled: true,
	systemStatus: 'unknown',
	canRequest: false,
};

const DEFAULT_CAMERA_PERMISSION: CameraPermissionSettings = {
	enabled: true,
	systemStatus: 'unknown',
	canRequest: false,
};

const MEDIA_PERMISSION_COPY = {
	microphone: {
		enabledTitleKey: 'settings.microphone.recording',
		enabledDescriptionKey: 'settings.microphone.recordingDescription',
		systemPermissionKey: 'settings.microphone.systemPermission',
		systemPermissionDescriptionKey: 'settings.microphone.systemPermissionDescription',
		refreshKey: 'settings.microphone.actions.refresh',
	},
	camera: {
		enabledTitleKey: 'settings.camera.access',
		enabledDescriptionKey: 'settings.camera.accessDescription',
		systemPermissionKey: 'settings.camera.systemPermission',
		systemPermissionDescriptionKey: 'settings.camera.systemPermissionDescription',
		refreshKey: 'settings.camera.actions.refresh',
	},
} satisfies Record<
	MediaPermissionKind,
	{
		readonly enabledTitleKey: string;
		readonly enabledDescriptionKey: string;
		readonly systemPermissionKey: string;
		readonly systemPermissionDescriptionKey: string;
		readonly refreshKey: string;
	}
>;

function permissionStatusKey(status: MediaPermissionStatus): string {
	return `settings.system.permissionStatus.${status}`;
}

function isBlockedPermission(permission: MediaPermissionSettings): boolean {
	return permission.systemStatus === 'denied' || permission.systemStatus === 'restricted';
}

function shouldOpenPermissionSettings(permission: MediaPermissionSettings): boolean {
	return permission.enabled && !permission.canRequest && isBlockedPermission(permission);
}

function mediaPermissionActionKey(
	kind: MediaPermissionKind,
	permission: MediaPermissionSettings
): string {
	if (!permission.enabled) return `settings.${kind}.actions.activate`;
	if (permission.systemStatus === 'granted') return `settings.${kind}.actions.check`;
	if (shouldOpenPermissionSettings(permission)) return `settings.${kind}.actions.openSettings`;
	return `settings.${kind}.actions.request`;
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function permissionStatusClassName(status: MediaPermissionStatus): string {
	switch (status) {
		case 'granted':
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
		case 'denied':
		case 'restricted':
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		case 'not-determined':
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
		default:
			return 'border-border/60 bg-muted/50 text-muted-foreground';
	}
}

function availabilityClassName(availability: SystemCapabilityAvailability): string {
	switch (availability) {
		case 'yes':
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
		case 'oftenYes':
			return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
		case 'sometimes':
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
		case 'yesAdmin':
		case 'yesHighPrivilege':
			return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300';
		case 'usuallyNo':
			return 'border-destructive/30 bg-destructive/10 text-destructive';
	}
}

function PermissionStatusBadge({
	status,
}: {
	readonly status: MediaPermissionStatus;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<span
			className={cn(
				'inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium',
				permissionStatusClassName(status)
			)}
		>
			{t(permissionStatusKey(status))}
		</span>
	);
}

function AvailabilityBadge({
	availability,
}: {
	readonly availability: SystemCapabilityAvailability;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<span
			className={cn(
				'inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium',
				availabilityClassName(availability)
			)}
		>
			{t(`settings.system.availability.${availability}`)}
		</span>
	);
}

function MediaPermissionRows({
	kind,
	icon: Icon,
	permission,
	loading,
	error,
	onToggle,
	onAction,
	onRefresh,
}: {
	readonly kind: MediaPermissionKind;
	readonly icon: LucideIcon;
	readonly permission: MediaPermissionSettings;
	readonly loading: boolean;
	readonly error: string;
	readonly onToggle: (checked: boolean) => void;
	readonly onAction: () => void;
	readonly onRefresh: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const copy = MEDIA_PERMISSION_COPY[kind];

	return (
		<>
			<SettingsRow
				title={t(copy.enabledTitleKey)}
				description={t(copy.enabledDescriptionKey)}
				icon={Icon}
				actions={
					<Switch
						checked={permission.enabled}
						disabled={loading}
						onCheckedChange={onToggle}
						aria-label={t(copy.enabledTitleKey)}
					/>
				}
			/>
			<SettingsRow
				title={t(copy.systemPermissionKey)}
				description={error || t(copy.systemPermissionDescriptionKey)}
				icon={ShieldCheck}
				actionClassName="sm:flex-nowrap"
				actions={
					<>
						<PermissionStatusBadge status={permission.systemStatus} />
						<Button
							variant="outline"
							size="xs"
							onClick={onAction}
							disabled={loading}
						>
							{t(mediaPermissionActionKey(kind, permission))}
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onRefresh}
							disabled={loading}
							aria-label={t(copy.refreshKey)}
							title={t(copy.refreshKey)}
						>
							<RefreshCw className="size-3" />
						</Button>
					</>
				}
			/>
		</>
	);
}

function SystemCapabilityRow({
	capability,
}: {
	readonly capability: SystemCapabilityItem;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingsRow
			title={t(capability.titleKey)}
			description={t(capability.noteKey)}
			icon={capability.icon}
			actions={<AvailabilityBadge availability={capability.availability} />}
		/>
	);
}

function SystemCapabilityGroupPanel({
	group,
}: {
	readonly group: SystemCapabilityGroup;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<SettingsPanel className="h-full">
			<div className="border-b border-border/60 px-3 py-2">
				<h3 className="text-[13px] font-medium leading-4 text-foreground">
					{t(group.titleKey)}
				</h3>
				<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
					{t(group.descriptionKey)}
				</p>
			</div>
			{group.capabilities.map((capability) => (
				<SystemCapabilityRow key={capability.id} capability={capability} />
			))}
		</SettingsPanel>
	);
}

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(false);
	const [keepAwakeLoading, setKeepAwakeLoading] = useState(true);
	const [keepAwakeError, setKeepAwakeError] = useState('');
	const [systemPreferenceError, setSystemPreferenceError] = useState('');
	const [microphonePermission, setMicrophonePermission] =
		useState<MicrophonePermissionSettings>(DEFAULT_MICROPHONE_PERMISSION);
	const [microphoneLoading, setMicrophoneLoading] = useState(true);
	const [microphoneError, setMicrophoneError] = useState('');
	const [cameraPermission, setCameraPermission] =
		useState<CameraPermissionSettings>(DEFAULT_CAMERA_PERMISSION);
	const [cameraLoading, setCameraLoading] = useState(true);
	const [cameraError, setCameraError] = useState('');

	useEffect(() => {
		let mounted = true;
		void window.app.getKeepAwakeEnabled()
			.then((enabled) => {
				if (mounted) setKeepAwakeEnabled(enabled);
			})
			.catch((error: unknown) => {
				if (!mounted) return;
				setKeepAwakeEnabled(false);
				setKeepAwakeError(errorMessage(error, t('settings.system.errors.keepAwakeLoad')));
			})
			.finally(() => {
				if (mounted) setKeepAwakeLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, [t]);

	const refreshMicrophonePermission = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			setMicrophonePermission(await window.app.getMicrophonePermission());
		} catch (error) {
			setMicrophoneError(errorMessage(error, t('settings.microphone.errors.load')));
		} finally {
			setMicrophoneLoading(false);
		}
	}, [t]);

	const refreshCameraPermission = useCallback(async (): Promise<void> => {
		setCameraLoading(true);
		setCameraError('');
		try {
			setCameraPermission(await window.app.getCameraPermission());
		} catch (error) {
			setCameraError(errorMessage(error, t('settings.camera.errors.load')));
		} finally {
			setCameraLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void refreshMicrophonePermission();
		void refreshCameraPermission();
	}, [refreshCameraPermission, refreshMicrophonePermission]);

	const handleKeepAwakeToggle = useCallback((checked: boolean) => {
		setKeepAwakeEnabled(checked);
		setKeepAwakeLoading(true);
		setKeepAwakeError('');
		void window.app.setKeepAwakeEnabled(checked)
			.then(setKeepAwakeEnabled)
			.catch((error: unknown) => {
				setKeepAwakeEnabled(!checked);
				setKeepAwakeError(errorMessage(error, t('settings.system.errors.keepAwakeSave')));
				void window.app.getKeepAwakeEnabled()
					.then(setKeepAwakeEnabled)
					.catch(() => undefined);
			})
			.finally(() => setKeepAwakeLoading(false));
	}, [t]);

	const handleMicrophoneToggle = useCallback((checked: boolean) => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		setMicrophonePermission((current) => ({ ...current, enabled: checked }));
		void (async () => {
			try {
				setMicrophonePermission(await window.app.setMicrophoneEnabled(checked));
			} catch (error) {
				setMicrophoneError(errorMessage(error, t('settings.microphone.errors.save')));
				await refreshMicrophonePermission();
			} finally {
				setMicrophoneLoading(false);
			}
		})();
	}, [refreshMicrophonePermission, t]);

	const handleCameraToggle = useCallback((checked: boolean) => {
		setCameraLoading(true);
		setCameraError('');
		setCameraPermission((current) => ({ ...current, enabled: checked }));
		void (async () => {
			try {
				setCameraPermission(await window.app.setCameraEnabled(checked));
			} catch (error) {
				setCameraError(errorMessage(error, t('settings.camera.errors.save')));
				await refreshCameraPermission();
			} finally {
				setCameraLoading(false);
			}
		})();
	}, [refreshCameraPermission, t]);

	const handleMicrophoneAction = useCallback(async (): Promise<void> => {
		setMicrophoneLoading(true);
		setMicrophoneError('');
		try {
			let next = microphonePermission;
			if (!next.enabled) {
				next = await window.app.setMicrophoneEnabled(true);
				setMicrophonePermission(next);
			}
			if (shouldOpenPermissionSettings(next)) {
				await window.app.openSystemPreference('Microphone');
				setMicrophonePermission(await window.app.getMicrophonePermission());
				return;
			}
			setMicrophonePermission(await window.app.requestMicrophonePermission());
		} catch (error) {
			setMicrophoneError(errorMessage(error, t('settings.microphone.errors.request')));
		} finally {
			setMicrophoneLoading(false);
		}
	}, [microphonePermission, t]);

	const handleCameraAction = useCallback(async (): Promise<void> => {
		setCameraLoading(true);
		setCameraError('');
		try {
			let next = cameraPermission;
			if (!next.enabled) {
				next = await window.app.setCameraEnabled(true);
				setCameraPermission(next);
			}
			if (shouldOpenPermissionSettings(next)) {
				await window.app.openSystemPreference('Camera');
				setCameraPermission(await window.app.getCameraPermission());
				return;
			}
			setCameraPermission(await window.app.requestCameraPermission());
		} catch (error) {
			setCameraError(errorMessage(error, t('settings.camera.errors.request')));
		} finally {
			setCameraLoading(false);
		}
	}, [cameraPermission, t]);

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
				icon={MonitorCog}
			/>

			{systemPreferenceError && (
				<SettingsNotice variant="destructive">{systemPreferenceError}</SettingsNotice>
			)}
			{keepAwakeError && (
				<SettingsNotice variant="destructive">{keepAwakeError}</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.system.mediaPermissions.title')}
				description={t('settings.system.mediaPermissions.description')}
			>
				<SettingsPanel>
					<MediaPermissionRows
						kind="microphone"
						icon={Mic}
						permission={microphonePermission}
						loading={microphoneLoading}
						error={microphoneError}
						onToggle={handleMicrophoneToggle}
						onAction={() => void handleMicrophoneAction()}
						onRefresh={() => void refreshMicrophonePermission()}
					/>
					<MediaPermissionRows
						kind="camera"
						icon={Camera}
						permission={cameraPermission}
						loading={cameraLoading}
						error={cameraError}
						onToggle={handleCameraToggle}
						onAction={() => void handleCameraAction()}
						onRefresh={() => void refreshCameraPermission()}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.application.actions')}
				description={t('settings.system.actionsDescription')}
			>
				<SettingsPanel>
					<SettingsRow
						title={t('settings.application.accessibility')}
						description={t('settings.application.accessibilityDescription')}
						icon={Accessibility}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenAccessibility}>
								{t('settings.application.openAccessibility')}
							</Button>
						}
					/>
					<SettingsRow
						title={t('settings.application.screenRecording')}
						description={t('settings.application.screenRecordingDescription')}
						icon={MonitorUp}
						actions={
							<Button variant="outline" size="xs" onClick={handleOpenScreenRecording}>
								{t('settings.application.openScreenRecording')}
							</Button>
						}
					/>
					<SettingsRow
						title={t('settings.application.keepAwake')}
						description={t('settings.application.keepAwakeDescription')}
						icon={BatteryCharging}
						actions={
							<Switch
								checked={keepAwakeEnabled}
								disabled={keepAwakeLoading}
								onCheckedChange={handleKeepAwakeToggle}
								aria-label={t('settings.application.keepAwake')}
							/>
						}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.system.capabilities.title')}
				description={t('settings.system.capabilities.description')}
			>
				<div className="grid gap-3 lg:grid-cols-2">
					{SYSTEM_CAPABILITY_GROUPS.map((group) => (
						<SystemCapabilityGroupPanel key={group.id} group={group} />
					))}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SystemPage;
