import type { AgentInputFile } from '../../../shared/agent_types';
import type { Config, Message, MessageContentBlock } from '../types';
import type { SessionInput, SessionCategory, SessionState } from './session_types';
import { loadMessagesBySessionId } from './session_load_messages_by_session_id';
import { persist } from './session_persist';
import { resolveSessionId } from './session_resolve_session_id';
import { sanitizeMessages } from './session_sanitize_messages';
import { sessionFolderName } from './session_session_folder_name';
import { sessionsRoot } from './session_sessions_root';
import { DEFAULT_CATEGORY } from './session_types';

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
	if (input.message || (input.files?.length ?? 0) > 0) {
		state.messages.push({ role: 'user', content: toUserContent(input.message, input.files ?? []) });
	}
	state.model = input.model ?? 'default';
	state.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
	state.toolCalls = [];
	state.usage = { inputTokens: 0, outputTokens: 0 };
	state.numTurns = 0;
	state.finalText = '';
	state.stopReason = undefined;
	state.runTraceBuffer = [];
	persist(state);
}

function toUserContent(message: string, files: AgentInputFile[]): Message['content'] {
	if (files.length === 0) return message;
	const blocks: MessageContentBlock[] = [];
	if (message) blocks.push({ type: 'text', text: message });
	for (const file of files) {
		blocks.push(
			file.mimeType.startsWith('image/')
				? { type: 'image', mimeType: file.mimeType, base64: file.data }
				: { type: 'file', name: file.name, mimeType: file.mimeType, base64: file.data }
		);
	}
	return blocks;
}
