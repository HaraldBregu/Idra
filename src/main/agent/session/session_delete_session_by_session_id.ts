import { existsSync, rmSync } from 'node:fs';
import type { SessionCategory } from './session_types';
import { legacyFilePath } from './session_legacy_file_path';
import { sessionFolderName } from './session_session_folder_name';
import { sessionPath } from './session_session_path';
import { sessionsRoot } from './session_sessions_root';

export function deleteSessionBySessionId(
	sessionId: string,
	category: SessionCategory,
	location: string
): void {
	const root = sessionsRoot(location, category);
	const folderPath = sessionPath(root, sessionFolderName(sessionId));
	if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
	const legacyPath = legacyFilePath(root, sessionId);
	if (existsSync(legacyPath)) rmSync(legacyPath, { force: true });
}
