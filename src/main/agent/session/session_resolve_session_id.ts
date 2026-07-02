import { randomUUID } from 'node:crypto';
import type { SessionCategory } from './session_types';
import { isUuid } from './session_is_uuid';
import { latestUuidSessionId } from './session_latest_uuid_session_id';
import { sessionsRoot } from './session_sessions_root';

export function resolveSessionId(
	sessionId: string | undefined,
	category: SessionCategory,
	location?: string
): string {
	if (!sessionId) return randomUUID();
	if (isUuid(sessionId) || !location) return sessionId;

	return latestUuidSessionId(sessionsRoot(location, category)) ?? randomUUID();
}
