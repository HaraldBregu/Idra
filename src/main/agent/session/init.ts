import { sessionFolderName, sessionsRoot } from './common';
import type { Config } from '../types';
import type { SessionInput, SessionCategory, SessionState } from './types';
import { loadMessagesBySessionId } from './load_messages_by_session_id';
import { persist } from './persist';
import { resolveSessionId } from './resolve_session_id';
import { sanitizeMessages } from './sanitize_messages';
import { DEFAULT_CATEGORY } from './types';

export function init(
	state: SessionState,
	config: Config,
	input: SessionInput,
	category: SessionCategory = DEFAULT_CATEGORY
): void {
	state.id = resolveSessionId(input.sessionId, config.location, category);
	state.category = category;
	state.folderName = sessionFolderName(state.id);
	state.sessionsPath = sessionsRoot(config.location);
	const storedMessages = loadMessagesBySessionId(state.id, config.location);
	const legacySessionId = input.legacySessionId ?? input.sessionId;
	const legacyMessages =
		legacySessionId && legacySessionId !== state.id && storedMessages.length === 0
			? loadMessagesBySessionId(legacySessionId, config.location)
			: [];
	state.messages = sanitizeMessages([
		...(storedMessages.length > 0 ? storedMessages : legacyMessages),
		...(input.messages ?? []),
	]);
	if (input.message) state.messages.push({ role: 'user', content: input.message });
	state.model = input.model ?? 'default';
	state.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
	state.toolCalls = [];
	state.usage = { inputTokens: 0, outputTokens: 0 };
	state.numTurns = 0;
	state.finalText = '';
	state.stopReason = undefined;
	state.runTraceBuffer = [];
	if (!input.deferPersist) persist(state);
}

