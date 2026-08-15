import { sessionPath } from './session_path';
import { sessionFolderName } from './session_folder_name';

export function infoFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'info.json');
}
