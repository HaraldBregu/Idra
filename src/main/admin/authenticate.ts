import { isAdminAuthenticated } from './authenticated';
import type { AdminAuthentication } from './types';

export function createAdminAuthentication(
	dataDirectory: string,
	adminToken?: string
): AdminAuthentication {
	return async (request, reply): Promise<unknown> => {
		if (!isAdminAuthenticated(request, dataDirectory, adminToken)) {
			return reply.code(401).header('www-authenticate', 'Bearer').send({ error: 'Unauthorized' });
		}
	};
}
