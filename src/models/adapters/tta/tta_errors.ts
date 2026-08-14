export class MusicProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MusicProviderAuthError';
	}
}

export class MusicProviderRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MusicProviderRequestError';
	}
}

export class MusicProviderUnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MusicProviderUnsupportedError';
	}
}
