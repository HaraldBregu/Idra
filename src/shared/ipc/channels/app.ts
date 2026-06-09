export const AppChannels = {
	openAppDataFolder: 'app:open-app-data-folder',
	openExternalUrl: 'app:open-external-url',
	authorizeOAuth: 'app:authorize-oauth',
	openSystemPreference: 'app:open-system-preference',
	setTrayEnabled: 'app:set-tray-enabled',
	getTrayEnabled: 'app:get-tray-enabled',
	getMicrophonePermission: 'app:get-microphone-permission',
	setMicrophoneEnabled: 'app:set-microphone-enabled',
	requestMicrophonePermission: 'app:request-microphone-permission',
	getCameraPermission: 'app:get-camera-permission',
	setCameraEnabled: 'app:set-camera-enabled',
	requestCameraPermission: 'app:request-camera-permission',
	setProviderApiKey: 'app:set-provider-api-key',
	isProviderApiKeySaved: 'app:is-provider-api-key-saved',
	getProviders: 'app:get-providers',
	getModels: 'app:get-models',
	getAgentService: 'app:get-agent-service',
	saveAgentService: 'app:save-agent-service',
	getSpeechTranscriberService: 'app:get-speech-transcriber-service',
	getSpeechToTextModels: 'app:get-speech-to-text-models',
	saveSpeechTranscriberService: 'app:save-speech-transcriber-service',
	getTextToSpeechService: 'app:get-text-to-speech-service',
	getTextToSpeechModels: 'app:get-text-to-speech-models',
	saveTextToSpeechService: 'app:save-text-to-speech-service',
	getImageCreatorService: 'app:get-image-creator-service',
	getImageCreatorModels: 'app:get-image-creator-models',
	saveImageCreatorService: 'app:save-image-creator-service',
	getTextToVideoService: 'app:get-text-to-video-service',
	getTextToVideoModels: 'app:get-text-to-video-models',
	saveTextToVideoService: 'app:save-text-to-video-service',
	getTextToSoundService: 'app:get-text-to-sound-service',
	getTextToSoundModels: 'app:get-text-to-sound-models',
	saveTextToSoundService: 'app:save-text-to-sound-service',
} as const;

type AppModelSelection = {
	provider: import('../../providers').PublicProvider;
	model: import('../../providers').ProviderModel;
};

export interface AppInvokeChannelMap {
	[AppChannels.openAppDataFolder]: {
		args: [];
		result: void;
	};
	[AppChannels.openExternalUrl]: {
		args: [url: string];
		result: void;
	};
	[AppChannels.authorizeOAuth]: {
		args: [input: unknown];
		result: unknown;
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
	[AppChannels.setProviderApiKey]: {
		args: [providerId: string, apikey: string];
		result: void;
	};
	[AppChannels.isProviderApiKeySaved]: {
		args: [providerId: string];
		result: boolean;
	};
	[AppChannels.getProviders]: {
		args: [];
		result: import('../../providers').PublicProvider[];
	};
	[AppChannels.getModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.getAgentService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.saveAgentService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AppChannels.getSpeechTranscriberService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.getSpeechToTextModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.saveSpeechTranscriberService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AppChannels.getTextToSpeechService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.getTextToSpeechModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.saveTextToSpeechService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AppChannels.getImageCreatorService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.getImageCreatorModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.saveImageCreatorService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AppChannels.getTextToVideoService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.getTextToVideoModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.saveTextToVideoService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AppChannels.getTextToSoundService]: {
		args: [];
		result: AppModelSelection | undefined;
	};
	[AppChannels.getTextToSoundModels]: {
		args: [provider: import('../../providers').PublicProvider];
		result: import('../../providers').ProviderModel[];
	};
	[AppChannels.saveTextToSoundService]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
}
