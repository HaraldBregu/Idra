import type { Config } from '../types';
import type { SessionCategory } from './session_types';
import { deleteSessionBySessionId } from './session_delete_session_by_session_id';
import { resolveStoredSessionId } from './session_resolve_stored_session_id';
import { DEFAULT_CATEGORY, type SessionState } from './session_types';

export function deleteSession(
	state: SessionState,
	config: Config,
	sessionId: string,
	category: SessionCategory = DEFAULT_CATEGORY
): void {
	const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
	deleteSessionBySessionId(resolvedSessionId, category, config.location);
	if (state.id === resolvedSessionId) state.messages = [];
}
