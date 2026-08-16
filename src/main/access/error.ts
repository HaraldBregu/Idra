export class AccessError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.name = 'AccessError';
		this.statusCode = statusCode;
	}
}
