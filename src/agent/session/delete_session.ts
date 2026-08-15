import type { Config } from '../types';
import { deleteSessionBySessionId } from './delete_session_by_session_id';
import { resolveStoredSessionId } from './resolve_stored_session_id';
import type { SessionState } from './types';

export function deleteSession(state: SessionState, config: Config, sessionId: string): void {
	const resolvedSessionId = resolveStoredSessionId(sessionId, config.location);
	deleteSessionBySessionId(resolvedSessionId, config.location);
	if (state.id === resolvedSessionId) state.messages = [];
}
