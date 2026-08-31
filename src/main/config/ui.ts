import fs from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { RequestLimiter } from '../oauth/limit';
import type { OAuthIssuer } from '../oauth/issuer';
import { createConfigurationAuthentication } from './auth';
import { configurationResponse } from './response';
import type { ConfigurationStore } from './store';

const html = fs.readFileSync(new URL('../../ui/config.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../../ui/config.js', import.meta.url), 'utf8');
const configStyles = fs.readFileSync(new URL('../../ui/config.css', import.meta.url), 'utf8');
const sharedStyles = fs.readFileSync(new URL('../../ui/styles.css', import.meta.url), 'utf8');

export function registerConfigurationUiRoutes(
	server: FastifyInstance,
	store: ConfigurationStore,
	adminToken: string,
	publicUrl: string,
	issuer: OAuthIssuer,
	limiter: RequestLimiter
): void {
	const authenticate = createConfigurationAuthentication(store, adminToken, publicUrl, limiter);
	server.get('/config/assets/styles.css', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=3600').type('text/css').send(sharedStyles)
	);
	server.get('/config/assets/config.css', async (_request, reply) =>
		reply.header('cache-control', 'public, max-age=3600').type('text/css').send(configStyles)
	);
	server.get('/config/assets/config.js', async (_request, reply) =>
		reply
			.header('cache-control', 'public, max-age=3600')
			.type('application/javascript')
			.send(script)
	);
	server.get('/config', async (request, reply) => {
		if (request.headers.accept?.toLowerCase().includes('text/html')) {
			return reply
				.header('cache-control', 'no-store')
				.header(
					'content-security-policy',
					"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
				)
				.header('referrer-policy', 'no-referrer')
				.header('x-content-type-options', 'nosniff')
				.header('x-frame-options', 'DENY')
				.header('vary', 'Accept')
				.type('text/html; charset=utf-8')
				.send(html);
		}
		await authenticate(request, reply);
		if (reply.sent) return;
		return reply.header('vary', 'Accept').send(configurationResponse(store, issuer));
	});
	server.get('/config/api', { onRequest: authenticate }, async (_request, reply) =>
		reply.header('cache-control', 'no-store').send(configurationResponse(store, issuer))
	);
}
