import type { FastifyInstance } from 'fastify';
import { OAuthError } from './error';
import type { OAuthIssuer } from './issuer';
import type { RequestLimiter } from './limit';

export function registerOAuthRoutes(
	server: FastifyInstance,
	issuer: OAuthIssuer,
	limiter: RequestLimiter
): void {
	server.addContentTypeParser(
		'application/x-www-form-urlencoded',
		{ parseAs: 'string', bodyLimit: 8 * 1024 },
		(_request, body, done) => {
			try {
				const parsed: Record<string, string> = {};
				for (const [key, value] of new URLSearchParams(body)) {
					if (Object.hasOwn(parsed, key)) throw new Error('Duplicate form field.');
					parsed[key] = value;
				}
				done(null, parsed);
			} catch (error) {
				done(error as Error);
			}
		}
	);
	server.get('/.well-known/oauth-authorization-server', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=300').send({
			issuer: issuer.issuer,
			token_endpoint: issuer.tokenEndpoint,
			jwks_uri: `${issuer.issuer}/.well-known/jwks.json`,
			grant_types_supported: ['client_credentials'],
			response_types_supported: [],
			scopes_supported: [issuer.scope],
			token_endpoint_auth_methods_supported: ['private_key_jwt'],
			token_endpoint_auth_signing_alg_values_supported: ['EdDSA'],
		})
	);
	server.get('/.well-known/oauth-protected-resource/a2a', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=300').send({
			resource: issuer.resource,
			authorization_servers: [issuer.issuer],
			bearer_methods_supported: ['header'],
			scopes_supported: [issuer.scope],
		})
	);
	server.get('/.well-known/jwks.json', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=300').send({
			keys: [issuer.store.publicSigningKey()],
		})
	);
	server.post<{ Body: Record<string, string> }>(
		'/a2a/oauth/token',
		{ bodyLimit: 8 * 1024 },
		async (request, reply) => {
			const clientId = request.body?.client_id ?? '';
			if (!limiter.consume(`token:${request.ip}:${clientId}`, 10, 60_000)) {
				return reply
					.code(429)
					.header('retry-after', '60')
					.header('cache-control', 'no-store')
					.send({ error: 'temporarily_unavailable' });
			}
			try {
				return reply
					.header('cache-control', 'no-store')
					.header('pragma', 'no-cache')
					.send(await issuer.issue(request.body ?? {}));
			} catch (error) {
				const oauth =
					error instanceof OAuthError
						? error
						: new OAuthError(400, 'invalid_request', 'The token request is invalid.');
				if (oauth.statusCode === 401) reply.header('www-authenticate', 'Bearer');
				return reply
					.code(oauth.statusCode)
					.header('cache-control', 'no-store')
					.header('pragma', 'no-cache')
					.send({ error: oauth.code, error_description: oauth.message });
			}
		}
	);
}
