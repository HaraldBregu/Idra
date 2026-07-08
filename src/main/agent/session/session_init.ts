import type { Config } from '../types';
import type { SessionInput, SessionCategory, SessionState } from './session_types';
import { loadMessagesBySessionId } from './session_load_messages_by_session_id';
import { persist } from './session_persist';
import { resolveSessionId } from './session_resolve_session_id';
import { sessionFolderName } from './session_session_folder_name';
import { sessionsRoot } from './session_sessions_root';
import { DEFAULT_CATEGORY } from './session_types';

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
