import type { SessionState } from './session_types';
import { sessionPath } from './session_session_path';

export function runFilePath(state: SessionState): string {
	return sessionPath(state.sessionsPath, state.folderName, 'run.jsonl');
}
