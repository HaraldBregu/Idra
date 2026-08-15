import type { Config } from '../types';
import type { Message } from '../types';
import { loadMessagesBySessionId } from './load_messages_by_session_id';
import { resolveStoredSessionId } from './resolve_stored_session_id';

export function loadMessages(config: Config, sessionId: string): Message[] {
	const resolvedSessionId = resolveStoredSessionId(sessionId, config.location);
	return loadMessagesBySessionId(resolvedSessionId, config.location);
}
