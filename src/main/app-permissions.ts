export class AppPermissionsService {
	private microphoneEnabled = true;
	private cameraEnabled = true;

	getAppPermissions(): { readonly microphoneEnabled: boolean; readonly cameraEnabled: boolean } {
		return {
			microphoneEnabled: this.microphoneEnabled,
			cameraEnabled: this.cameraEnabled,
		};
	}

	getMicrophoneEnabled(): boolean {
		return this.microphoneEnabled;
	}

	setMicrophoneEnabled(enabled: boolean): { readonly microphoneEnabled: boolean; readonly cameraEnabled: boolean } {
		this.microphoneEnabled = enabled;
		return this.getAppPermissions();
	}

	getCameraEnabled(): boolean {
		return this.cameraEnabled;
	}

	setCameraEnabled(enabled: boolean): { readonly microphoneEnabled: boolean; readonly cameraEnabled: boolean } {
		this.cameraEnabled = enabled;
		return this.getAppPermissions();
	}
}
