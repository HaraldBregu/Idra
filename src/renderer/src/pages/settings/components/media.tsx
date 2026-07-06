import React, { useCallback, useEffect, useState } from 'react';
import {
	Camera,
	ChevronRight,
	Mic,
	MonitorUp,
	RefreshCw,
	Settings,
	ShieldCheck,
	type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
	CameraPermissionSettings,
	MicrophonePermissionSettings,
	SystemPreferencePaneId,
} from '@shared/app_types';
import {
	SettingsNotice,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from './index';

type MediaSystemPermissionStatus = MicrophonePermissionSettings['systemStatus'];

interface MediaPermissionConfig {
	readonly icon: LucideIcon;
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly requestLabelKey: string;
	readonly openSettingsLabelKey: string;
	readonly refreshLabelKey: string;
	readonly detailPath: string;
}

const MICROPHONE_PERMISSION: MediaPermissionConfig = {
	icon: Mic,
	titleKey: 'settings.microphone.title',
	descriptionKey: 'settings.microphone.systemPermissionDescription',
	requestLabelKey: 'settings.microphone.actions.request',
	openSettingsLabelKey: 'settings.microphone.actions.openSettings',
	refreshLabelKey: 'settings.microphone.actions.refresh',
	detailPath: '/settings/system/media/microphone',
};

const CAMERA_PERMISSION: MediaPermissionConfig = {
	icon: Camera,
	titleKey: 'settings.camera.title',
	descriptionKey: 'settings.camera.systemPermissionDescription',
	requestLabelKey: 'settings.camera.actions.request',
	openSettingsLabelKey: 'settings.camera.actions.openSettings',
	refreshLabelKey: 'settings.camera.actions.refresh',
	detailPath: '/settings/system/media/camera',
};

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

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

async function acquireMediaStream(constraints: MediaStreamConstraints): Promise<void> {
	const stream = await navigator.mediaDevices.getUserMedia(constraints);
	stream.getTracks().forEach((track) => track.stop());
}

function statusClassName(status: MediaSystemPermissionStatus): string {
	switch (status) {
		case 'granted':
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
		case 'denied':
		case 'restricted':
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		case 'not-determined':
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
		case 'unsupported':
			return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300';
		case 'unknown':
			return 'border-border bg-muted/40 text-muted-foreground';
	}
}

function canOpenSystemSettings(status: MediaSystemPermissionStatus): boolean {
	return status === 'granted' || status === 'denied' || status === 'restricted';
}

function MediaPermissionRow({
	config,
	permission,
	error,
	onRequest,
	onOpenSettings,
	onRefresh,
	onOpenDetail,
}: {
	readonly config: MediaPermissionConfig;
	readonly permission: MicrophonePermissionSettings | CameraPermissionSettings;
	readonly error: string;
	readonly onRequest: () => void;
	readonly onOpenSettings: () => void;
	readonly onRefresh: () => void;
	readonly onOpenDetail: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const Icon = config.icon;

	return (
		<SettingsRow
			title={t(config.titleKey)}
			description={error || t(config.descriptionKey)}
			icon={Icon}
			actionClassName="gap-1.5"
			actions={
				<>
					<span
						className={cn(
							'inline-flex h-6 min-w-20 shrink-0 items-center justify-center rounded-md border px-2 text-[11px] font-medium',
							statusClassName(permission.systemStatus)
						)}
					>
						{t(`settings.system.permissionStatus.${permission.systemStatus}`)}
					</span>
					{permission.canRequest && (
						<Button variant="outline" size="xs" onClick={onRequest}>
							<ShieldCheck className="size-3" />
							{t(config.requestLabelKey)}
						</Button>
					)}
					{!permission.canRequest && canOpenSystemSettings(permission.systemStatus) && (
						<Button variant="outline" size="xs" onClick={onOpenSettings}>
							<Settings className="size-3" />
							{t(config.openSettingsLabelKey)}
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onRefresh}
						aria-label={t(config.refreshLabelKey)}
						title={t(config.refreshLabelKey)}
					>
						<RefreshCw className="size-3" />
					</Button>
				</>
			}
		/>
	);
}

export function MediaPermissionsSection({
	className,
}: {
	readonly className?: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [microphonePermission, setMicrophonePermission] =
		useState<MicrophonePermissionSettings>(DEFAULT_MICROPHONE_PERMISSION);
	const [microphoneError, setMicrophoneError] = useState('');
	const [cameraPermission, setCameraPermission] =
		useState<CameraPermissionSettings>(DEFAULT_CAMERA_PERMISSION);
	const [cameraError, setCameraError] = useState('');
	const [systemPreferenceError, setSystemPreferenceError] = useState('');

	const refreshMicrophonePermission = useCallback(async (): Promise<void> => {
		setMicrophoneError('');
		try {
			setMicrophonePermission(await window.app.getMicrophonePermission());
		} catch (error) {
			setMicrophoneError(errorMessage(error, t('settings.microphone.errors.load')));
		}
	}, [t]);

	const refreshCameraPermission = useCallback(async (): Promise<void> => {
		setCameraError('');
		try {
			setCameraPermission(await window.app.getCameraPermission());
		} catch (error) {
			setCameraError(errorMessage(error, t('settings.camera.errors.load')));
		}
	}, [t]);

	useEffect(() => {
		void refreshMicrophonePermission();
		void refreshCameraPermission();
	}, [refreshCameraPermission, refreshMicrophonePermission]);

	const handleRequestMicrophonePermission = useCallback(async (): Promise<void> => {
		setMicrophoneError('');
		try {
			await acquireMediaStream({ audio: true });
			setMicrophonePermission(await window.app.requestMicrophonePermission());
		} catch (error) {
			setMicrophoneError(errorMessage(error, t('settings.microphone.errors.request')));
		}
	}, [t]);

	const handleRequestCameraPermission = useCallback(async (): Promise<void> => {
		setCameraError('');
		try {
			await acquireMediaStream({ video: true });
			setCameraPermission(await window.app.requestCameraPermission());
		} catch (error) {
			setCameraError(errorMessage(error, t('settings.camera.errors.request')));
		}
	}, [t]);

	const handleOpenSystemPreference = useCallback((pane: SystemPreferencePaneId) => {
		setSystemPreferenceError('');
		void window.app.openSystemPreference(pane)
			.catch((error: unknown) => {
				setSystemPreferenceError(errorMessage(error, t('settings.system.errors.openPreference')));
			});
	}, [t]);

	const handleOpenMicrophoneSettings = useCallback(() => {
		handleOpenSystemPreference('Microphone');
	}, [handleOpenSystemPreference]);

	const handleOpenCameraSettings = useCallback(() => {
		handleOpenSystemPreference('Camera');
	}, [handleOpenSystemPreference]);

	return (
		<>
			{systemPreferenceError && (
				<SettingsNotice variant="destructive">{systemPreferenceError}</SettingsNotice>
			)}
			<SettingsSection
				title={t('settings.system.mediaPermissions.title')}
				description={t('settings.system.mediaPermissions.description')}
				className={className}
			>
				<SettingsPanel>
					<MediaPermissionRow
						config={MICROPHONE_PERMISSION}
						permission={microphonePermission}
						error={microphoneError}
						onRequest={() => void handleRequestMicrophonePermission()}
						onOpenSettings={handleOpenMicrophoneSettings}
						onRefresh={() => void refreshMicrophonePermission()}
					/>
					<MediaPermissionRow
						config={CAMERA_PERMISSION}
						permission={cameraPermission}
						error={cameraError}
						onRequest={() => void handleRequestCameraPermission()}
						onOpenSettings={handleOpenCameraSettings}
						onRefresh={() => void refreshCameraPermission()}
					/>
				</SettingsPanel>
			</SettingsSection>
		</>
	);
}
