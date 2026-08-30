import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { AdministratorCredentials, ConfigurationSession } from './types';

export const CONFIGURATION_SESSION_SECONDS = 12 * 60 * 60;

export function sessionHash(token: string): string {
	return createHash('sha256').update(token).digest('base64url');
}

export function csrfToken(token: string, administrator: AdministratorCredentials): string {
	return createHmac('sha256', Buffer.from(administrator.sessionSecret, 'base64url'))
		.update(token)
		.digest('base64url');
}

export function newSession(now = Date.now()): { record: ConfigurationSession; token: string } {
	const token = randomBytes(32).toString('base64url');
	return {
		token,
		record: {
			createdAt: new Date(now).toISOString(),
			expiresAt: now + CONFIGURATION_SESSION_SECONDS * 1000,
			tokenHash: sessionHash(token),
		},
	};
}
