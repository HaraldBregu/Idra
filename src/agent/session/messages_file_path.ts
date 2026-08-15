import type { SessionState } from './types';
import { sessionPath } from './session_path';

export function messagesFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'messages.json');
}
