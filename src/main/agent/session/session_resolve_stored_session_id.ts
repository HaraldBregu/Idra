import { isUuid } from './session_is_uuid';
import { latestUuidSessionId } from './session_latest_uuid_session_id';
import { sessionsRoot } from './session_sessions_root';

export function resolveStoredSessionId(sessionId: string, location?: string): string {
	if (isUuid(sessionId) || !location) return sessionId;
	return latestUuidSessionId(sessionsRoot(location)) ?? sessionId;
}
