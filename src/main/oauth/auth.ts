import type { RequestHandler } from 'express';
import type { OAuthIssuer } from './issuer';
import type { RequestIdentity } from './identity';
import type { RequestLimiter } from './limit';

export function createOAuthAuthentication(
	issuer: OAuthIssuer,
	identity: RequestIdentity,
	limiter: RequestLimiter
): RequestHandler {
	return (request, response, next): void => {
		const match = /^Bearer ([^\s]+)$/.exec(request.header('authorization') ?? '');
		if (!match) {
			response
				.setHeader(
					'WWW-Authenticate',
					`Bearer realm="a2a", resource_metadata="${issuer.protectedResourceUrl}", scope="${issuer.scope}"`
				)
				.status(401)
				.json({ error: 'Unauthorized' });
			return;
		}
		void issuer
			.authenticate(match[1])
			.then((principal) => {
				if (!limiter.consume(`a2a:${principal.clientId}`, 60, 60_000)) {
					response.setHeader('Retry-After', '60').status(429).json({ error: 'Too Many Requests' });
					return;
				}
				identity.set(request, principal.clientId);
				next();
			})
			.catch(() => {
				response
					.setHeader(
						'WWW-Authenticate',
						`Bearer realm="a2a", error="invalid_token", resource_metadata="${issuer.protectedResourceUrl}", scope="${issuer.scope}"`
					)
					.status(401)
					.json({ error: 'Unauthorized' });
			});
	};
}
