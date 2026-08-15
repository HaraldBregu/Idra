import { existsSync, writeFileSync } from 'node:fs';
import { isUuid } from './is_uuid';
import { legacyFilePath } from './legacy_file_path';
import { messagesBackupFile } from './messages_backup_file';
import { messagesFile } from './messages_file';
import { sessionFolderName } from './session_folder_name';
import { sessionPath } from './session_path';
import { sessionsRoot } from './sessions_root';
import { writeMessagesFile } from './write_messages_file';

export function clearMessagesBySessionId(sessionId: string, location: string): void {
	const root = sessionsRoot(location);
	const currentPath = isUuid(sessionId) ? messagesFile(root, sessionId) : undefined;
	const filePath = currentPath && existsSync(currentPath) ? currentPath : legacyFilePath(root, sessionId);
	if (!existsSync(filePath)) return;
	if (isUuid(sessionId)) {
		const backupPath = messagesBackupFile(root, sessionId);
		writeMessagesFile(filePath, backupPath, '[]\n');
		writeFileSync(backupPath, '[]\n', 'utf8');
	}
	else writeFileSync(filePath, '[]\n', 'utf8');

	if (!isUuid(sessionId)) return;
	const runPath = sessionPath(root, sessionFolderName(sessionId), 'run.jsonl');
	if (existsSync(runPath)) writeFileSync(runPath, '', 'utf8');
}
