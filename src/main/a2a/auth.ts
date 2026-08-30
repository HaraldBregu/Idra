import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { RequestIdentity } from '../oauth/identity';

export function createBearerAuthentication(
	token: string,
	identity?: RequestIdentity
): RequestHandler {
	const expected = Buffer.from(token, 'utf8');
	return (request, response, next): void => {
		const match = /^Bearer ([^\s]+)$/i.exec(request.header('authorization') ?? '');
		const actual = Buffer.from(match?.[1] ?? '', 'utf8');
		if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
			identity?.set(request, 'legacy-shared-token');
			next();
			return;
		}
		response.setHeader('WWW-Authenticate', 'Bearer');
		response.status(401).json({ error: 'Unauthorized' });
	};
}
