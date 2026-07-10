export class VideoProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VideoProviderAuthError';
	}
}

export class VideoProviderRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VideoProviderRequestError';
	}
}

export class VideoProviderUnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VideoProviderUnsupportedError';
	}
}
