import type { FastifyInstance } from 'fastify';
import type { OAuthIssuer } from './issuer';

export function registerOAuthRoutes(server: FastifyInstance, issuer: OAuthIssuer): void {
	server.get('/.well-known/oauth-authorization-server', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=300').send({
			issuer: issuer.issuer,
			token_endpoint: issuer.tokenEndpoint,
			jwks_uri: `${issuer.issuer}/.well-known/jwks.json`,
			grant_types_supported: ['client_credentials'],
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
}
