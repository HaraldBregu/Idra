import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { accessSessionCookie } from '../access/cookie';
import { verifyAccessSession } from '../access/session_verify';

export function isAdminAuthenticated(
	request: Pick<FastifyRequest, 'headers'>,
	dataDirectory: string,
	adminToken?: string
): boolean {
	const authorization = request.headers.authorization ?? '';
	if (adminToken) {
		const actual = Buffer.from(authorization);
		const expected = Buffer.from(`Bearer ${adminToken}`);
		if (actual.length === expected.length && timingSafeEqual(actual, expected)) return true;
	}
	return verifyAccessSession(dataDirectory, accessSessionCookie(request.headers.cookie));
}
