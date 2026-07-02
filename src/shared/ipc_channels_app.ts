export const AppChannels = {
	openAppDataFolder: 'app:open-app-data-folder',
	openExternalUrl: 'app:open-external-url',
	openSystemPreference: 'app:open-system-preference',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
	getCameraPermission: 'app:get-camera-permission',
	setCameraEnabled: 'app:set-camera-enabled',
	requestCameraPermission: 'app:request-camera-permission',
} as const;

export interface AppInvokeChannelMap {
	[AppChannels.openAppDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openExternalUrl]: {
		args: [url: string];
		result: void;
	};
	[AppChannels.setTrayEnabled]: {
		args: [enabled: boolean];
		result: void;
	};
	[AppChannels.getTrayEnabled]: {
		args: [];
		result: boolean;
	};
	[AppChannels.getMicrophonePermission]: {
		args: [];
		result: import('../../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.setMicrophoneEnabled]: {
		args: [enabled: boolean];
		result: import('../../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.requestMicrophonePermission]: {
		args: [];
		result: import('../../app/app-permissions').MicrophonePermissionSettings;
	};
	[AppChannels.openSystemPreference]: {
		args: [pane: import('../../app/app-permissions').SystemPreferencePaneId];
		result: void;
	};
	[AppChannels.getCameraPermission]: {
		args: [];
		result: import('../../app/app-permissions').CameraPermissionSettings;
	};
	[AppChannels.setCameraEnabled]: {
		args: [enabled: boolean];
		result: import('../../app/app-permissions').CameraPermissionSettings;
	};
	[AppChannels.requestCameraPermission]: {
		args: [];
		result: import('../../app/app-permissions').CameraPermissionSettings;
	};
}
