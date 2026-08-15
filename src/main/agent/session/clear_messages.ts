import type { Config } from '../types';
import { clearMessagesBySessionId } from './clear_messages_by_session_id';
import { resolveStoredSessionId } from './resolve_stored_session_id';
import type { SessionState } from './types';

export function clearMessages(state: SessionState, config: Config, sessionId: string): void {
	const resolvedSessionId = resolveStoredSessionId(sessionId, config.location);
	clearMessagesBySessionId(resolvedSessionId, config.location);
	if (state.id === resolvedSessionId) state.messages = [];
}
