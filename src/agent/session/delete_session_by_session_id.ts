import { existsSync, rmSync } from 'node:fs';
import { isUuid } from './is_uuid';
import { legacyFilePath } from './legacy_file_path';
import { sessionFolderName } from './session_folder_name';
import { sessionPath } from './session_path';
import { sessionsRoot } from './sessions_root';

export function deleteSessionBySessionId(sessionId: string, location: string): void {
	const root = sessionsRoot(location);
	if (isUuid(sessionId)) {
		const folderPath = sessionPath(root, sessionFolderName(sessionId));
		if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
	}
	const legacyPath = legacyFilePath(root, sessionId);
	if (existsSync(legacyPath)) rmSync(legacyPath, { force: true });
}
