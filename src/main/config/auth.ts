import { timingSafeEqual } from 'node:crypto';
import type { onRequestHookHandler } from 'fastify';
import type { RequestLimiter } from '../oauth/limit';

export function createConfigurationAuthentication(
	token: string,
	limiter: RequestLimiter
): onRequestHookHandler {
	const expected = Buffer.from(`Bearer ${token}`);
	return async (request, reply): Promise<unknown> => {
		reply.header('cache-control', 'no-store');
		if (!limiter.consume(`config:${request.ip}`, 30, 60_000)) {
			return reply.code(429).header('retry-after', '60').send({ error: 'Too Many Requests' });
		}
		const actual = Buffer.from(request.headers.authorization ?? '');
		if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
			return reply.code(401).header('www-authenticate', 'Bearer').send({ error: 'Unauthorized' });
		}
	};
}
