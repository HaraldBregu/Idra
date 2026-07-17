import path from 'node:path';
import type { SessionState } from '../session';
import { sessionDir } from '../session/session_session_dir';

export function goalPath(state: SessionState): string {
	return path.join(sessionDir(state), 'goal.json');
}
