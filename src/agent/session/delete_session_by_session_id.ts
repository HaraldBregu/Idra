import { existsSync, rmSync } from 'node:fs';
import { isUuid } from './common';
import { legacyFilePath } from './legacy_file_path';
import { sessionFolderName } from './common';
import { sessionPath } from './common';
import { sessionsRoot } from './common';

export function deleteSessionBySessionId(sessionId: string, location: string): void {
	const root = sessionsRoot(location);
	if (isUuid(sessionId)) {
		const folderPath = sessionPath(root, sessionFolderName(sessionId));
		if (existsSync(folderPath)) rmSync(folderPath, { recursive: true, force: true });
	}
	const legacyPath = legacyFilePath(root, sessionId);
	if (existsSync(legacyPath)) rmSync(legacyPath, { force: true });
}
