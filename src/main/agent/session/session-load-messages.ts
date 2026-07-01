import type { Config } from '../core/types';
import type { Message } from '../core/types';
import type { SessionCategory } from './session-types';
import { loadMessagesBySessionId } from './session-load-messages-by-session-id';
import { resolveStoredSessionId } from './session-resolve-stored-session-id';
import { DEFAULT_CATEGORY } from './session-types';

export function loadMessages(
	config: Config,
	sessionId: string,
	category: SessionCategory = DEFAULT_CATEGORY
): Message[] {
	const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
	return loadMessagesBySessionId(resolvedSessionId, category, config.location);
}
