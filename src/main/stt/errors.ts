export class SttProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SttProviderAuthError';
	}
}

export class SttProviderRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SttProviderRequestError';
	}
}

export class SttProviderUnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SttProviderUnsupportedError';
	}
}
