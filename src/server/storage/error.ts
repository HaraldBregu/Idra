export class StorageError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.name = 'StorageError';
		this.statusCode = statusCode;
	}
}
