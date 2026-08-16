import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { isAdminAuthenticated } from './admin/authenticated';

const securityHeaders = {
	'cache-control': 'no-store',
	'content-security-policy':
		"default-src 'self'; base-uri 'none'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'",
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff',
};

interface UiOptions {
	accessControl: boolean;
	adminToken?: string;
	dataDirectory: string;
}

export function registerUiRoutes(server: FastifyInstance, options: UiOptions): void {
	const indexPath = fileURLToPath(new URL('../ui/index.html', import.meta.url));
	const accessPath = fileURLToPath(new URL('../ui/access.html', import.meta.url));
	const assetPath = (name: string): string =>
		fileURLToPath(new URL(`../ui/${name}`, import.meta.url));
	const sendIndex = async (
		_request: unknown,
		reply: {
			headers(values: Record<string, string>): unknown;
			type(value: string): { send(value: string): unknown };
		}
	): Promise<unknown> => {
		reply.headers(securityHeaders);
		return reply.type('text/html; charset=utf-8').send(fs.readFileSync(indexPath, 'utf8'));
	};

	const sendProtectedIndex = async (request: Parameters<typeof isAdminAuthenticated>[0], reply: any) => {
		if (
			options.accessControl &&
			!isAdminAuthenticated(request, options.dataDirectory, options.adminToken)
		) {
			return reply.redirect('/access');
		}
		return sendIndex(request, reply);
	};
	server.get('/', sendProtectedIndex);
	server.get('/storage-test', sendProtectedIndex);
	server.get('/access', async (request, reply) => {
		if (
			options.accessControl &&
			isAdminAuthenticated(request, options.dataDirectory, options.adminToken)
		) {
			return reply.redirect('/');
		}
		reply.headers(securityHeaders);
		return reply.type('text/html; charset=utf-8').send(fs.readFileSync(accessPath, 'utf8'));
	});
	for (const [name, type] of [
		['styles.css', 'text/css; charset=utf-8'],
		['api.js', 'text/javascript; charset=utf-8'],
		['suite.js', 'text/javascript; charset=utf-8'],
		['marker.js', 'text/javascript; charset=utf-8'],
		['agent.js', 'text/javascript; charset=utf-8'],
		['key.js', 'text/javascript; charset=utf-8'],
		['access.js', 'text/javascript; charset=utf-8'],
		['app.js', 'text/javascript; charset=utf-8'],
	] as const) {
		server.get(`/ui/${name}`, async (_request, reply) => {
			reply.headers(securityHeaders);
			return reply.type(type).send(fs.readFileSync(assetPath(name), 'utf8'));
		});
	}
}
