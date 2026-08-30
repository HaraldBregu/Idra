import type { RequestHandler } from 'express';
import type { OAuthIssuer } from './issuer';
import type { RequestIdentity } from './identity';
import type { RequestLimiter } from './limit';

export function createOAuthAuthentication(
	issuer: OAuthIssuer,
	identity: RequestIdentity,
	limiter: RequestLimiter
): RequestHandler {
	const resourceUrl = issuer.resource;
	return (request, response, next): void => {
		response.setHeader('Cache-Control', 'no-store');
		if (!limiter.consume(`a2a-source:${request.socket.remoteAddress ?? 'unknown'}`, 600, 60_000)) {
			response.setHeader('Retry-After', '60').status(429).json({ error: 'Too Many Requests' });
			return;
		}
		const resourceMetadata =
			new URL(request.originalUrl, issuer.issuer).href === resourceUrl
				? `, resource_metadata="${issuer.protectedResourceUrl}"`
				: '';
		const match = /^Bearer ([^\s]+)$/i.exec(request.header('authorization') ?? '');
		if (!match) {
			response
				.setHeader(
					'WWW-Authenticate',
					`Bearer realm="a2a"${resourceMetadata}, scope="${issuer.scope}"`
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
						`Bearer realm="a2a", error="invalid_token"${resourceMetadata}, scope="${issuer.scope}"`
					)
					.status(401)
					.json({ error: 'Unauthorized' });
			});
	};
}
