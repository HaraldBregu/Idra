import path from 'node:path';
import type { SessionState } from './session-types';
import { sessionDir } from './session-session-dir';

export function messagesFilePath(state: SessionState): string {
	return path.join(sessionDir(state), 'messages.json');
}
