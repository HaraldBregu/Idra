import { existsSync, readFileSync } from 'node:fs';
import type { Message } from '../types';
import { isMessage } from './session_is_message';
import { isRecord } from './session_is_record';
import { isUuid } from './session_is_uuid';
import { legacyFilePath } from './session_legacy_file_path';
import { messagesFile } from './session_messages_file';
import { sessionsRoot } from './session_sessions_root';

export function loadMessagesBySessionId(sessionId: string, location?: string): Message[] {
	if (!location) return [];
	const root = sessionsRoot(location);
	const currentPath = isUuid(sessionId) ? messagesFile(root, sessionId) : undefined;
	const filePath = currentPath && existsSync(currentPath) ? currentPath : legacyFilePath(root, sessionId);
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
