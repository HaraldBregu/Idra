import {
	AppWindow,
	Bell,
	Bluetooth,
	Clipboard,
	Cpu,
	ExternalLink,
	Files,
	HardDrive,
	Info,
	Keyboard,
	MapPin,
	Mic,
	Microchip,
	Network,
	Printer,
	RadioTower,
	ServerCog,
	Settings2,
	Usb,
	Volume2,
	Webcam,
	type LucideIcon,
} from 'lucide-react';

export type SystemCapabilityAvailability =
	| 'yes'
	| 'oftenYes'
	| 'sometimes'
	| 'yesAdmin'
	| 'yesHighPrivilege'
	| 'usuallyNo';

export interface SystemCapabilityItem {
	readonly id: string;
	readonly titleKey: string;
	readonly noteKey: string;
	readonly availability: SystemCapabilityAvailability;
	readonly icon: LucideIcon;
}

export interface SystemCapabilityGroup {
	readonly id: string;
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly capabilities: readonly SystemCapabilityItem[];
}

export const SYSTEM_CAPABILITY_GROUPS = [
	{
		id: 'core',
		titleKey: 'settings.system.capabilities.groups.core.title',
		descriptionKey: 'settings.system.capabilities.groups.core.description',
		capabilities: [
			{
				id: 'open-windows-and-ui',
				titleKey: 'settings.system.capabilities.items.openWindowsAndUi.title',
				noteKey: 'settings.system.capabilities.items.openWindowsAndUi.note',
				availability: 'yes',
				icon: AppWindow,
			},
			{
				id: 'read-write-files',
				titleKey: 'settings.system.capabilities.items.readWriteFiles.title',
				noteKey: 'settings.system.capabilities.items.readWriteFiles.note',
				availability: 'yes',
				icon: Files,
			},
			{
				id: 'access-internet-network',
				titleKey: 'settings.system.capabilities.items.accessInternetNetwork.title',
				noteKey: 'settings.system.capabilities.items.accessInternetNetwork.note',
				availability: 'yes',
				icon: Network,
			},
			{
				id: 'start-other-programs',
				titleKey: 'settings.system.capabilities.items.startOtherPrograms.title',
				noteKey: 'settings.system.capabilities.items.startOtherPrograms.note',
				availability: 'yes',
				icon: ExternalLink,
			},
			{
				id: 'run-background-tasks',
				titleKey: 'settings.system.capabilities.items.runBackgroundTasks.title',
				noteKey: 'settings.system.capabilities.items.runBackgroundTasks.note',
				availability: 'yes',
				icon: RadioTower,
			},
			{
				id: 'access-system-information',
				titleKey: 'settings.system.capabilities.items.accessSystemInformation.title',
				noteKey: 'settings.system.capabilities.items.accessSystemInformation.note',
				availability: 'yes',
				icon: Info,
			},
		],
	},
	{
		id: 'media',
		titleKey: 'settings.system.capabilities.groups.media.title',
		descriptionKey: 'settings.system.capabilities.groups.media.description',
		capabilities: [
			{
				id: 'use-webcam',
				titleKey: 'settings.system.capabilities.items.useWebcam.title',
				noteKey: 'settings.system.capabilities.items.useWebcam.note',
				availability: 'yes',
				icon: Webcam,
			},
			{
				id: 'use-microphone-record-voice',
				titleKey: 'settings.system.capabilities.items.useMicrophoneRecordVoice.title',
				noteKey: 'settings.system.capabilities.items.useMicrophoneRecordVoice.note',
				availability: 'yes',
				icon: Mic,
			},
			{
				id: 'play-audio-video',
				titleKey: 'settings.system.capabilities.items.playAudioVideo.title',
				noteKey: 'settings.system.capabilities.items.playAudioVideo.note',
				availability: 'yes',
				icon: Volume2,
			},
			{
				id: 'send-notifications',
				titleKey: 'settings.system.capabilities.items.sendNotifications.title',
				noteKey: 'settings.system.capabilities.items.sendNotifications.note',
				availability: 'yes',
				icon: Bell,
			},
			{
				id: 'use-gps-location',
				titleKey: 'settings.system.capabilities.items.useGpsLocation.title',
				noteKey: 'settings.system.capabilities.items.useGpsLocation.note',
				availability: 'sometimes',
				icon: MapPin,
			},
		],
	},
	{
		id: 'devices',
		titleKey: 'settings.system.capabilities.groups.devices.title',
		descriptionKey: 'settings.system.capabilities.groups.devices.description',
		capabilities: [
			{
				id: 'use-bluetooth',
				titleKey: 'settings.system.capabilities.items.useBluetooth.title',
				noteKey: 'settings.system.capabilities.items.useBluetooth.note',
				availability: 'yes',
				icon: Bluetooth,
			},
			{
				id: 'access-usb-devices',
				titleKey: 'settings.system.capabilities.items.accessUsbDevices.title',
				noteKey: 'settings.system.capabilities.items.accessUsbDevices.note',
				availability: 'yes',
				icon: Usb,
			},
			{
				id: 'use-printer-scanner',
				titleKey: 'settings.system.capabilities.items.usePrinterScanner.title',
				noteKey: 'settings.system.capabilities.items.usePrinterScanner.note',
				availability: 'yes',
				icon: Printer,
			},
			{
				id: 'access-keyboard-mouse-input',
				titleKey: 'settings.system.capabilities.items.accessKeyboardMouseInput.title',
				noteKey: 'settings.system.capabilities.items.accessKeyboardMouseInput.note',
				availability: 'yes',
				icon: Keyboard,
			},
			{
				id: 'read-clipboard',
				titleKey: 'settings.system.capabilities.items.readClipboard.title',
				noteKey: 'settings.system.capabilities.items.readClipboard.note',
				availability: 'oftenYes',
				icon: Clipboard,
			},
			{
				id: 'use-gpu',
				titleKey: 'settings.system.capabilities.items.useGpu.title',
				noteKey: 'settings.system.capabilities.items.useGpu.note',
				availability: 'yes',
				icon: Cpu,
			},
		],
	},
	{
		id: 'privileged',
		titleKey: 'settings.system.capabilities.groups.privileged.title',
		descriptionKey: 'settings.system.capabilities.groups.privileged.description',
		capabilities: [
			{
				id: 'change-system-settings',
				titleKey: 'settings.system.capabilities.items.changeSystemSettings.title',
				noteKey: 'settings.system.capabilities.items.changeSystemSettings.note',
				availability: 'sometimes',
				icon: Settings2,
			},
			{
				id: 'install-services-daemons',
				titleKey: 'settings.system.capabilities.items.installServicesDaemons.title',
				noteKey: 'settings.system.capabilities.items.installServicesDaemons.note',
				availability: 'yesAdmin',
				icon: ServerCog,
			},
			{
				id: 'access-low-level-hardware-directly',
				titleKey: 'settings.system.capabilities.items.accessLowLevelHardwareDirectly.title',
				noteKey: 'settings.system.capabilities.items.accessLowLevelHardwareDirectly.note',
				availability: 'usuallyNo',
				icon: Microchip,
			},
			{
				id: 'install-drivers',
				titleKey: 'settings.system.capabilities.items.installDrivers.title',
				noteKey: 'settings.system.capabilities.items.installDrivers.note',
				availability: 'yesHighPrivilege',
				icon: HardDrive,
			},
		],
	},
] satisfies readonly SystemCapabilityGroup[];
