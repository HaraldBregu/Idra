import { sessionPath, sessionFolderName } from './common';

export function infoFile(sessionsPath: string, sessionId: string): string {
	return sessionPath(sessionsPath, sessionFolderName(sessionId), 'info.json');
}
