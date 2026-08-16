import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export function createBearerAuthentication(token: string): RequestHandler {
	const expected = Buffer.from(token, 'utf8');
	return (request, response, next): void => {
		const match = /^Bearer ([^\s]+)$/i.exec(request.header('authorization') ?? '');
		const actual = Buffer.from(match?.[1] ?? '', 'utf8');
		if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
			next();
			return;
		}
		response.setHeader('WWW-Authenticate', 'Bearer');
		response.status(401).json({ error: 'Unauthorized' });
	};
}
