import { existsSync, readFileSync } from 'node:fs';
import type { Message } from '../types';
import type { SessionCategory } from './session_types';
import { isMessage } from './session_is_message';
import { isRecord } from './session_is_record';
import { legacyFilePath } from './session_legacy_file_path';
import { messagesFile } from './session_messages_file';
import { sessionsRoot } from './session_sessions_root';

export function loadMessagesBySessionId(
	sessionId: string,
	category: SessionCategory,
	location?: string
): Message[] {
	if (!location) return [];
	const root = sessionsRoot(location, category);
	const filePath = existsSync(messagesFile(root, sessionId))
		? messagesFile(root, sessionId)
		: legacyFilePath(root, sessionId);
	if (!existsSync(filePath)) return [];
	try {
		const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
		if (Array.isArray(raw)) return raw.filter(isMessage);
		if (isRecord(raw) && Array.isArray(raw.content)) return raw.content.filter(isMessage);
		return [];
	} catch {
		return [];
	}
}
