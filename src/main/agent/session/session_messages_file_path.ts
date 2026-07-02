import path from 'node:path';
import type { SessionState } from './session_types';
import { sessionDir } from './session_session_dir';

export function messagesFilePath(state: SessionState): string {
	return path.join(sessionDir(state), 'messages.json');
}
