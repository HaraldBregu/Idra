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
