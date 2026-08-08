import type { SessionState } from './session_types';
import { sessionPath } from './session_session_path';

export function messagesBackupFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'messages.json.bak');
}
