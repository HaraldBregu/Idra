import type { SessionCategory } from './types';
import { DEFAULT_CATEGORY } from './types';
import { isUuid } from './is_uuid';
import { latestUuidSessionId } from './latest_uuid_session_id';
import { sessionsRoot } from './sessions_root';

export function resolveStoredSessionId(
	sessionId: string,
	location?: string,
	category: SessionCategory = DEFAULT_CATEGORY
): string {
	if (isUuid(sessionId) || !location) return sessionId;
	return latestUuidSessionId(sessionsRoot(location), category) ?? sessionId;
}
