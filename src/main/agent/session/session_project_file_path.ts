import path from 'node:path';
import type { SessionState } from './session_types';
import { sessionDir } from './session_session_dir';

export function projectFilePath(state: SessionState): string {
	return path.join(sessionDir(state), 'project.json');
}
