import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SessionCategory } from './session_types';
import { legacyFilePath } from './session_legacy_file_path';
import { messagesFile } from './session_messages_file';
import { sessionFolderName } from './session_session_folder_name';
import { sessionPath } from './session_session_path';
import { sessionsRoot } from './session_sessions_root';

export function clearMessagesBySessionId(
	sessionId: string,
	category: SessionCategory,
	location: string
): void {
	const root = sessionsRoot(location, category);
	const filePath = existsSync(messagesFile(root, sessionId))
		? messagesFile(root, sessionId)
		: legacyFilePath(root, sessionId);
	if (!existsSync(filePath)) return;
	writeFileSync(filePath, '[]\n', 'utf8');

	const runPath = path.join(
		sessionPath(root, sessionFolderName(sessionId)),
		'run.jsonl'
	);
	if (existsSync(runPath)) writeFileSync(runPath, '', 'utf8');
}
