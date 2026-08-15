import { isUuid, sessionsRoot } from './common';
import { existsSync, readFileSync } from 'node:fs';
import type { Message } from '../types';
import { legacyFilePath } from './legacy_file_path';
import { messagesBackupFile } from './messages_backup_file';
import { messagesFile } from './messages_file';
import { parseMessages } from './parse_messages';

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
			return messages;
	}
	return [];
}
