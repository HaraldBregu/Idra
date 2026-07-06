import React, { useEffect, useState } from 'react';
import { Camera, ChevronRight, Mic, MonitorUp, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MicrophonePermissionSettings } from '@shared/app_types';
import { SettingsPanel, SettingsRow, SettingsSection } from './index';

type MediaSystemPermissionStatus = MicrophonePermissionSettings['systemStatus'];

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

function MediaRow({
	icon,
	title,
	status,
	detailPath,
}: {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly status?: MediaSystemPermissionStatus;
	readonly detailPath: string;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<SettingsRow
			title={title}
			icon={icon}
			actionClassName="gap-1.5"
			actions={
				<>
					{status && (
						<span
							className={cn(
								'inline-flex h-6 min-w-20 shrink-0 items-center justify-center rounded-md border px-2 text-[11px] font-medium',
								statusClassName(status)
							)}
						>
							{t(`settings.system.permissionStatus.${status}`)}
						</span>
					)}
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => navigate(detailPath)}
						aria-label={t('settings.system.media.open')}
						title={t('settings.system.media.open')}
					>
						<ChevronRight className="size-3" />
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
	const [microphoneStatus, setMicrophoneStatus] =
		useState<MediaSystemPermissionStatus>('unknown');
	const [cameraStatus, setCameraStatus] = useState<MediaSystemPermissionStatus>('unknown');

	useEffect(() => {
		void window.app
			.getMicrophonePermission()
			.then((permission) => setMicrophoneStatus(permission.systemStatus))
			.catch(() => undefined);
		void window.app
			.getCameraPermission()
			.then((permission) => setCameraStatus(permission.systemStatus))
			.catch(() => undefined);
	}, []);

	return (
		<SettingsSection
			title={t('settings.system.mediaPermissions.title')}
			description={t('settings.system.mediaPermissions.description')}
			className={className}
		>
			<SettingsPanel>
				<MediaRow
					icon={Mic}
					title={t('settings.microphone.title')}
					status={microphoneStatus}
					detailPath="/settings/system/media/microphone"
				/>
				<MediaRow
					icon={Camera}
					title={t('settings.camera.title')}
					status={cameraStatus}
					detailPath="/settings/system/media/camera"
				/>
				<MediaRow
					icon={MonitorUp}
					title={t('settings.system.media.screen.title')}
					detailPath="/settings/system/media/screen"
				/>
			</SettingsPanel>
		</SettingsSection>
	);
}
