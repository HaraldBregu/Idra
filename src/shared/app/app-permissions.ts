export type MicrophoneSystemPermissionStatus =
	| 'not-determined'
	| 'granted'
	| 'denied'
	| 'restricted'
	| 'unknown'
	| 'unsupported';

export interface MicrophonePermissionSettings {
	readonly enabled: boolean;
	readonly systemStatus: MicrophoneSystemPermissionStatus;
	readonly canRequest: boolean;
}

export type CameraSystemPermissionStatus =
	| 'not-determined'
	| 'granted'
	| 'denied'
	| 'restricted'
	| 'unknown'
	| 'unsupported';

export interface CameraPermissionSettings {
	readonly enabled: boolean;
	readonly systemStatus: CameraSystemPermissionStatus;
	readonly canRequest: boolean;
}

export type SystemPreferencePaneId = 'Accessibility' | 'ScreenCapture' | 'Camera' | 'Microphone';
