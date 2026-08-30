export class OAuthError extends Error {
	constructor(
		readonly statusCode: 400 | 401,
		readonly code:
			| 'invalid_client'
			| 'invalid_request'
			| 'invalid_scope'
			| 'invalid_target'
			| 'unsupported_grant_type',
		message: string
	) {
		super(message);
	}
}
