import { existsSync, readFileSync } from 'node:fs';
import type { Message } from '../types';
import { isUuid } from './session_is_uuid';
import { legacyFilePath } from './session_legacy_file_path';
import { messagesBackupFile } from './session_messages_backup_file';
import { messagesFile } from './session_messages_file';
import { hydrateAttachments } from './session_hydrate_attachments';
import { parseMessages } from './session_parse_messages';
import { sessionsRoot } from './session_sessions_root';

export function loadMessagesBySessionId(sessionId: string, location?: string): Message[] {
	if (!location) return [];
	const root = sessionsRoot(location);
	const currentPath = isUuid(sessionId) ? messagesFile(root, sessionId) : undefined;
	const backupPath = isUuid(sessionId) ? messagesBackupFile(root, sessionId) : undefined;
	const filePath =
		currentPath && (existsSync(currentPath) || (backupPath && existsSync(backupPath)))
			? currentPath
			: legacyFilePath(root, sessionId);
	for (const candidate of [filePath, filePath === currentPath ? backupPath : undefined]) {
		if (!candidate || !existsSync(candidate)) continue;
		const messages = parseMessages(readFileSync(candidate, 'utf8'));
		if (messages !== undefined)
			return isUuid(sessionId) ? hydrateAttachments(messages, root, sessionId) : messages;
	}
	return [];
}
