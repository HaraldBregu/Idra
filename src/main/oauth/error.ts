export class OAuthError extends Error {
	constructor(
		readonly statusCode: 400 | 401,
		readonly code: 'invalid_client' | 'invalid_grant' | 'invalid_request' | 'invalid_scope',
		message: string
	) {
		super(message);
	}
}
