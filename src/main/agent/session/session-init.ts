import type { Config } from '../core/types';
import type { SessionInput, SessionCategory, SessionState } from './session-types';
import { loadMessagesBySessionId } from './session-load-messages-by-session-id';
import { persist } from './session-persist';
import { resolveSessionId } from './session-resolve-session-id';
import { sessionFolderName } from './session-session-folder-name';
import { sessionsRoot } from './session-sessions-root';
import { DEFAULT_CATEGORY } from './session-types';

export function init(
	state: SessionState,
	config: Config,
	input: SessionInput,
	category: SessionCategory = DEFAULT_CATEGORY
): void {
	state.id = resolveSessionId(input.sessionId, category, config.location);
	state.folderName = sessionFolderName(state.id);
	state.sessionsPath = sessionsRoot(config.location, category);
	const storedMessages = loadMessagesBySessionId(state.id, category, config.location);
	const legacyMessages =
		input.sessionId && input.sessionId !== state.id && storedMessages.length === 0
			? loadMessagesBySessionId(input.sessionId, category, config.location)
			: [];
	state.messages = [
		...(storedMessages.length > 0 ? storedMessages : legacyMessages),
		...(input.messages ?? []),
	];
	if (input.message) state.messages.push({ role: 'user', content: input.message });
	state.model = input.model ?? 'default';
	state.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
	persist(state);
}
