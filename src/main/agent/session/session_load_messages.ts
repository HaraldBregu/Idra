import type { Config } from '../types';
import type { Message } from '../types';
import type { SessionCategory } from './session_types';
import { loadMessagesBySessionId } from './session_load_messages_by_session_id';
import { resolveStoredSessionId } from './session_resolve_stored_session_id';
import { DEFAULT_CATEGORY } from './session_types';

export function loadMessages(
	config: Config,
	sessionId: string,
	category: SessionCategory = DEFAULT_CATEGORY
): Message[] {
	const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
	return loadMessagesBySessionId(resolvedSessionId, category, config.location);
}
