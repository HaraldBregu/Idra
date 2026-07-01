import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SessionCategory } from '../core/types';
import { legacyFilePath } from './session-legacy-file-path';
import { messagesFile } from './session-messages-file';
import { sessionFolderName } from './session-session-folder-name';
import { sessionPath } from './session-session-path';
import { sessionsRoot } from './session-sessions-root';

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
