import type { SessionState } from './types';
import { sessionPath } from './common';

export function messagesBackupFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'messages.json.bak');
}
