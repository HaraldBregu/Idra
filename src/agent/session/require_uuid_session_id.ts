import { isUuid } from './common';

export function requireUuidSessionId(value: unknown): string {
	const sessionId = typeof value === 'string' ? value.trim() : '';
	if (!isUuid(sessionId)) throw new Error('Invalid assistant session id.');
	return sessionId;
}
