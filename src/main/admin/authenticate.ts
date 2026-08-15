import { timingSafeEqual } from 'node:crypto';

export function createAdminAuthentication(adminToken: string) {
	const expectedAuthorization = Buffer.from(`Bearer ${adminToken}`);
	return async (
		request: { headers: { authorization?: string } },
		reply: {
			code(statusCode: number): {
				header(name: string, value: string): { send(payload: object): unknown };
			};
		}
	): Promise<unknown> => {
		const authorization = Buffer.from(request.headers.authorization ?? '');
		if (
			authorization.length !== expectedAuthorization.length ||
			!timingSafeEqual(authorization, expectedAuthorization)
		) {
			return reply.code(401).header('www-authenticate', 'Bearer').send({ error: 'Unauthorized' });
		}
	};
}
