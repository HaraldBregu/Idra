import type { SessionState } from './types';
import { sessionPath } from './session_path';

export function runFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'run.jsonl');
}
