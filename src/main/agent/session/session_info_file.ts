import { sessionPath } from './session_session_path';
import { sessionFolderName } from './session_session_folder_name';

export function infoFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'info.json');
}
