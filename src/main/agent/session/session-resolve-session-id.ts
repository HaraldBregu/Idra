import { randomUUID } from 'node:crypto';
import type { SessionCategory } from './session-types';
import { isUuid } from './session-is-uuid';
import { latestUuidSessionId } from './session-latest-uuid-session-id';
import { sessionsRoot } from './session-sessions-root';

export function resolveSessionId(
	sessionId: string | undefined,
	category: SessionCategory,
	location?: string
): string {
	if (!sessionId) return randomUUID();
	if (isUuid(sessionId) || !location) return sessionId;

	return latestUuidSessionId(sessionsRoot(location, category)) ?? randomUUID();
}
