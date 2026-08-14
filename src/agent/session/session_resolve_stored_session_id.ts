import type { SessionCategory } from './session_types';
import { DEFAULT_CATEGORY } from './session_types';
import { isUuid } from './session_is_uuid';
import { latestUuidSessionId } from './session_latest_uuid_session_id';
import { sessionsRoot } from './session_sessions_root';

export function resolveStoredSessionId(
	sessionId: string,
	location?: string,
	category: SessionCategory = DEFAULT_CATEGORY
): string {
	if (isUuid(sessionId) || !location) return sessionId;
	return latestUuidSessionId(sessionsRoot(location), category) ?? sessionId;
}
