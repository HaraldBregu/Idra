import { randomUUID } from 'node:crypto';
import type { SessionCategory } from './types';
import { DEFAULT_CATEGORY } from './types';
import { isUuid } from './common';
import { latestUuidSessionId } from './latest_uuid_session_id';
import { sessionsRoot } from './common';

export function resolveSessionId(
	sessionId: string | undefined,
	location?: string,
	category: SessionCategory = DEFAULT_CATEGORY
): string {
	if (!sessionId) return randomUUID();
	if (isUuid(sessionId) || !location) return sessionId;

	return latestUuidSessionId(sessionsRoot(location), category) ?? randomUUID();
}
