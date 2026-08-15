import { isUuid, sessionFolderName, sessionPath, sessionsRoot } from './common';
import { existsSync, rmSync } from 'node:fs';
import { legacyFilePath } from './legacy_file_path';

export function deleteSessionBySessionId(sessionId: string, location: string): void {
	const root = sessionsRoot(location);
	if (isUuid(sessionId)) {
		const folderPath = sessionPath(root, sessionFolderName(sessionId));
		if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
	}
	const legacyPath = legacyFilePath(root, sessionId);
	if (existsSync(legacyPath)) rmSync(legacyPath, { force: true });
}
