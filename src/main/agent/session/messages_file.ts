import { sessionPath, sessionFolderName } from './common';

export function messagesFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'messages.json');
}
