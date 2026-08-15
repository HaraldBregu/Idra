import { sessionPath } from './common';
import { sessionFolderName } from './common';

export function messagesBackupFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'messages.json.bak');
}
