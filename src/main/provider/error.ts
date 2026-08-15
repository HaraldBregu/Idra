export class ProviderError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.name = 'ProviderError';
		this.statusCode = statusCode;
	}
}
