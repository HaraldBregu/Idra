import { Camera, Mic, MonitorUp, type LucideIcon } from 'lucide-react';

export type SystemMediaId = 'camera' | 'microphone' | 'screen';

export interface SystemMedia {
	readonly id: SystemMediaId;
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
	/** getUserMedia (user) vs getDisplayMedia (display). */
	readonly source: 'user' | 'display';
	readonly constraints: MediaStreamConstraints;
	/** Whether the capture has a video track to preview. */
	readonly video: boolean;
	/** Queryable OS permission, when one exists. */
	readonly permission?: 'camera' | 'microphone';
}

export const SYSTEM_MEDIA: readonly SystemMedia[] = [
	{
		id: 'camera',
		titleKey: 'settings.system.media.camera.label',
		descriptionKey: 'settings.system.media.camera.description',
		icon: Camera,
		source: 'user',
		constraints: { video: true },
		video: true,
		permission: 'camera',
	},
	{
		id: 'microphone',
		titleKey: 'settings.system.media.microphone.label',
		descriptionKey: 'settings.system.media.microphone.description',
		icon: Mic,
		source: 'user',
		constraints: { audio: true },
		video: false,
		permission: 'microphone',
	},
	{
		id: 'screen',
		titleKey: 'settings.system.media.screen.title',
		descriptionKey: 'settings.system.media.screen.description',
		icon: MonitorUp,
		source: 'display',
		constraints: { video: true },
		video: true,
	},
];

export function getSystemMedia(id: string | undefined): SystemMedia | null {
	return SYSTEM_MEDIA.find((media) => media.id === id) ?? null;
}
