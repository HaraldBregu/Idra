import { Service } from 'typedi';

export interface AppPermissionsState {
	microphoneEnabled: boolean;
	cameraEnabled: boolean;
}

@Service()
export class AppPermissionsService {
	private state: AppPermissionsState = {
		microphoneEnabled: true,
		cameraEnabled: true,
	};

	getMicrophoneEnabled(): boolean {
		return this.state.microphoneEnabled;
	}

	setMicrophoneEnabled(enabled: boolean): AppPermissionsState {
		this.state = {
			...this.state,
			microphoneEnabled: enabled,
		};
		return this.state;
	}

	getCameraEnabled(): boolean {
		return this.state.cameraEnabled;
	}

	setCameraEnabled(enabled: boolean): AppPermissionsState {
		this.state = {
			...this.state,
			cameraEnabled: enabled,
		};
		return this.state;
	}
}
