import { Router, urlencoded } from 'express';
import { OAuthError } from './error';
import type { OAuthIssuer } from './issuer';
import type { RequestLimiter } from './limit';

export function createTokenRouter(issuer: OAuthIssuer, limiter: RequestLimiter): Router {
	const router = Router();
	router.post(
		'/oauth/token',
		urlencoded({ extended: false, limit: 8 * 1024, parameterLimit: 12 }),
		(request, response) => {
			const body = request.body as Record<string, string> | undefined;
			const clientId = body?.client_id ?? '';
			if (!limiter.consume(`token:${request.ip}:${clientId}`, 10, 60_000)) {
				response
					.status(429)
					.setHeader('Retry-After', '60')
					.setHeader('Cache-Control', 'no-store')
					.json({ error: 'temporarily_unavailable' });
				return;
			}
			void issuer
				.issue(body ?? {})
				.then((token) => {
					response
						.setHeader('Cache-Control', 'no-store')
						.setHeader('Pragma', 'no-cache')
						.json(token);
				})
				.catch((error) => {
					const oauth =
						error instanceof OAuthError
							? error
							: new OAuthError(400, 'invalid_request', 'The token request is invalid.');
					response
						.status(oauth.statusCode)
						.setHeader('Cache-Control', 'no-store')
						.setHeader('Pragma', 'no-cache')
						.json({ error: oauth.code, error_description: oauth.message });
				});
		}
	);
	return router;
}
