import path from 'node:path';
import { sessionPath } from './session-session-path';
import { sessionFolderName } from './session-session-folder-name';

export function messagesFile(sessionsPath: string, sessionId: string): string {
	return path.join(
		sessionPath(sessionsPath, sessionFolderName(sessionId)),
		'messages.json'
	);
}
