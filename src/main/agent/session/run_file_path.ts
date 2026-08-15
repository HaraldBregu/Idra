import type { SessionState } from './types';
import { sessionPath } from './common';

export function runFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'run.jsonl');
}
