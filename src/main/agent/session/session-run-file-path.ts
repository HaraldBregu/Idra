import path from 'node:path';
import type { SessionState } from './session-types';
import { sessionDir } from './session-session-dir';

export function runFilePath(state: SessionState): string {
	return path.join(sessionDir(state), 'run.jsonl');
}
