export class ImageProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageProviderAuthError';
	}
}

export class ImageProviderRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageProviderRequestError';
	}
}

export class ImageProviderUnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageProviderUnsupportedError';
	}
}
