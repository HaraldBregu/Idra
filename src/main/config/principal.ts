import type { FastifyRequest } from 'fastify';
import { readConfigurationCookie } from './cookie';
import { equalText } from './equal';
import { sessionHash } from './session';
import type { ConfigurationStore } from './store';

export type ConfigurationPrincipal =
	| { method: 'admin-bearer'; subject: 'administrator' }
	| { method: 'ui-session'; subject: string; token: string };

export function configurationPrincipal(
	request: FastifyRequest,
	store: ConfigurationStore,
	adminToken: string,
	publicUrl: string
): ConfigurationPrincipal | undefined {
	const authorization = request.headers.authorization ?? '';
	if (equalText(authorization, `Bearer ${adminToken}`)) {
		return { method: 'admin-bearer', subject: 'administrator' };
	}
	const token = readConfigurationCookie(request.headers.cookie, publicUrl);
	const administrator = store.administrator();
	if (!token || !administrator || !store.hasSession(sessionHash(token), Date.now())) return undefined;
	return { method: 'ui-session', subject: administrator.username, token };
}
