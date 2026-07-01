import type { SessionCategory } from '../core/types';
import { isUuid } from './session-is-uuid';
import { latestUuidSessionId } from './session-latest-uuid-session-id';
import { sessionsRoot } from './session-sessions-root';

export function resolveStoredSessionId(
	sessionId: string,
	category: SessionCategory,
	location?: string
): string {
	if (isUuid(sessionId) || !location) return sessionId;
	return latestUuidSessionId(sessionsRoot(location, category)) ?? sessionId;
}
