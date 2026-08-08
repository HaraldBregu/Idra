import { sessionPath } from './session_session_path';
import { sessionFolderName } from './session_session_folder_name';

export function messagesFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'messages.json');
}
