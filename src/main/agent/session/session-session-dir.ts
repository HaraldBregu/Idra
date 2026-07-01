import path from 'node:path';
import type { SessionState } from './session-types';
import { sessionPath } from './session-session-path';

export function sessionDir(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName);
}
