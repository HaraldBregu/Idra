import type { SessionState } from './types';
import { sessionPath } from './common';

export function sessionDir(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName);
}
