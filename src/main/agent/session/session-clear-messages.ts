import type { Config } from '../core/types';
import type { SessionCategory } from './session-types';
import { clearMessagesBySessionId } from './session-clear-messages-by-session-id';
import { resolveStoredSessionId } from './session-resolve-stored-session-id';
import { DEFAULT_CATEGORY, type SessionState } from './session-types';

export function clearMessages(
	state: SessionState,
	config: Config,
	sessionId: string,
	category: SessionCategory = DEFAULT_CATEGORY
): void {
	const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
	clearMessagesBySessionId(resolvedSessionId, category, config.location);
	if (state.id === resolvedSessionId) state.messages = [];
}
