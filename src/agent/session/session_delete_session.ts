import type { Config } from '../types';
import { deleteSessionBySessionId } from './session_delete_session_by_session_id';
import { resolveStoredSessionId } from './session_resolve_stored_session_id';
import type { SessionState } from './session_types';

export function deleteSession(state: SessionState, config: Config, sessionId: string): void {
	const resolvedSessionId = resolveStoredSessionId(sessionId, config.location);
	deleteSessionBySessionId(resolvedSessionId, config.location);
	if (state.id === resolvedSessionId) state.messages = [];
}
