export class SpeechProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SpeechProviderAuthError';
	}
}

export class SpeechProviderRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SpeechProviderRequestError';
	}
}

export class SpeechProviderUnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SpeechProviderUnsupportedError';
	}
}
